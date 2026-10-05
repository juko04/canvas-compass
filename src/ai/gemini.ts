import { GoogleGenerativeAI } from '@google/generative-ai';
import { GradedItem, ItemType } from '../types/items';
import { TermRange } from '../api/termAnchors';
import { store } from '../storage/store';

export interface ExtractedAiItem {
  title: string;
  type: ItemType;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  points: number | null;
  weight: number | null;
  recurrence?: string | null;
  source_doc?: string;
  source_snippet?: string;
  confidence: number;
  notes?: string;
}

export interface AiExtractionResult {
  items: GradedItem[];
  usedAi: boolean;
  model: string;
  error?: string;
}

export interface AiProvider {
  extractDeadlines(
    documentText: string,
    filename: string,
    courseId: string,
    courseName: string,
    termRange: TermRange
  ): Promise<AiExtractionResult>;
}

const AI_EXTRACTION_PROMPT = `
You are an expert academic syllabus analyzer for University of Colorado Boulder.
Extract all graded assignments, exams, quizzes, capstone projects, presentations, labs, readings, attendance events, and extra credit opportunities from the provided syllabus/schedule text.

Term bounds:
Start Date: {{TERM_START}}
End Date: {{TERM_END}}

CRITICAL RULES:
1. Ignore stale calendar years printed in footers (e.g. "Fall 2023" in a 2026 file). Anchor all yearless dates (e.g. "Sep 9") to the term year {{TERM_YEAR}}.
2. Return ONLY a valid JSON array of objects conforming exactly to this schema:
[
  {
    "title": "string (name of assignment or milestone)",
    "type": "assignment" | "quiz" | "exam" | "project" | "presentation" | "lab" | "reading" | "extra_credit" | "attendance" | "checkin",
    "date": "YYYY-MM-DD" or null if TBD/undated,
    "time": "HH:MM" (24-hr format) or null,
    "points": number or null,
    "weight": number (percentage e.g. 20 for 20%) or null,
    "recurrence": "weekly" or null,
    "source_doc": "filename string",
    "source_snippet": "short exact excerpt string",
    "confidence": number between 0.0 and 1.0,
    "notes": "string (materials, submission instructions, location)"
  }
]
Do not wrap in markdown quotes if json mode is active.
`;

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public async extractDeadlines(
    documentText: string,
    filename: string,
    courseId: string,
    courseName: string,
    termRange: TermRange
  ): Promise<AiExtractionResult> {
    if (!this.apiKey) {
      return { items: [], usedAi: false, model: this.modelName, error: 'No Gemini API key configured.' };
    }

    try {
      store.addLog('ai', 'info', `Calling Gemini (${this.modelName}) for ${filename}...`);

      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const termYear = termRange.startDate.split('-')[0];
      const prompt = AI_EXTRACTION_PROMPT
        .replace('{{TERM_START}}', termRange.startDate)
        .replace('{{TERM_END}}', termRange.endDate)
        .replace('{{TERM_YEAR}}', termYear) +
        `\n\n--- DOCUMENT: ${filename} ---\n${documentText.slice(0, 30000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const rawItems: ExtractedAiItem[] = JSON.parse(text);

      const validatedItems: GradedItem[] = [];
      for (const raw of rawItems) {
        // Discard low-confidence items (let Tier 1 handle them)
        if (typeof raw.confidence === 'number' && raw.confidence < 0.6) {
          store.addLog('ai', 'warn', `Skipping low confidence AI item: ${raw.title} (${raw.confidence})`);
          continue;
        }

        validatedItems.push({
          id: `ai-${filename}-${validatedItems.length + 1}`,
          courseId,
          courseName,
          courseColor: '#CFB87C',
          title: raw.title,
          type: validateItemType(raw.type),
          dueDate: raw.date || null,
          dueTime: raw.time || null,
          points: typeof raw.points === 'number' ? raw.points : null,
          weight: typeof raw.weight === 'number' ? raw.weight : null,
          isTBD: !raw.date,
          isUndated: !raw.date,
          isInferred: !!raw.recurrence,
          source: 'syllabus',
          sourceDoc: filename,
          sourceSnippet: raw.source_snippet,
          confidence: raw.confidence,
          notes: raw.notes,
          completed: false
        });
      }

      store.addLog('ai', 'info', `Gemini successfully extracted ${validatedItems.length} items from ${filename}`);
      return {
        items: validatedItems,
        usedAi: true,
        model: this.modelName
      };
    } catch (err: any) {
      store.addLog('ai', 'error', `Gemini extraction failed for ${filename}: ${err.message}. Falling back to Tier 1.`);
      return {
        items: [],
        usedAi: false,
        model: this.modelName,
        error: err.message
      };
    }
  }
}

function validateItemType(typeStr: string): ItemType {
  const valid: ItemType[] = [
    'assignment',
    'quiz',
    'exam',
    'project',
    'presentation',
    'lab',
    'reading',
    'extra_credit',
    'attendance',
    'checkin',
    'no_class'
  ];
  if (valid.includes(typeStr as any)) return typeStr as ItemType;
  return 'assignment';
}
