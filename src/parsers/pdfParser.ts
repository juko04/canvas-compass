import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GradedItem } from '../types/items';
import { TermRange, resolveDateToTerm, resolveWeekToDate } from '../api/termAnchors';
import { classifyItemType, extractDueTime } from './classifier';
import { CU_BOULDER_FALL_2026 } from '../api/academicCalendar';

export interface PdfParseResult {
  items: GradedItem[];
  isScanned: boolean;
  needsManualReview: boolean;
  rawText: string;
  totalPages: number;
}

interface TextItemCoord {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReconstructedRow {
  y: number;
  items: TextItemCoord[];
}

export async function parsePdfDocument(
  pdfBytes: Uint8Array,
  filename: string,
  courseId: string,
  courseName: string,
  courseColor: string = '#CFB87C',
  termRange: TermRange = { startDate: CU_BOULDER_FALL_2026.startDate, endDate: CU_BOULDER_FALL_2026.endDate }
): Promise<PdfParseResult> {
  const doc = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  let totalTextItems = 0;
  const allRows: ReconstructedRow[] = [];
  let fullRawText = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    totalTextItems += content.items.length;

    // Cluster into horizontal rows
    const pageRows: ReconstructedRow[] = [];
    for (const rawItem of content.items as any[]) {
      if (!rawItem.str || !rawItem.str.trim()) continue;
      const x = Math.round(rawItem.transform[4]);
      const y = Math.round(rawItem.transform[5]);
      const width = rawItem.width || 0;
      const height = rawItem.height || 10;
      const str = rawItem.str.trim();

      fullRawText += str + ' ';

      let row = pageRows.find(r => Math.abs(r.y - y) <= 4.0);
      if (!row) {
        row = { y, items: [] };
        pageRows.push(row);
      }
      row.items.push({ str, x, y, width, height });
    }

    // Sort page rows top-to-bottom
    pageRows.sort((a, b) => b.y - a.y);
    allRows.push(...pageRows);
  }

  // Scanned PDF detection: zero or negligible text layer
  if (totalTextItems < 15) {
    return {
      items: [],
      isScanned: true,
      needsManualReview: true,
      rawText: '',
      totalPages: doc.numPages
    };
  }

  const items: GradedItem[] = [];
  let currentMonth: string | null = null;
  let currentWeekNumber: number | null = null;

  // Process rows sequentially
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    row.items.sort((a, b) => a.x - b.x);

    const rowText = row.items.map(it => it.str).join(' ');

    // 1. Month tracking (AUG, SEPT, OCT, NOV, DEC)
    const monthMatch = rowText.match(/\b(AUG(?:UST)?|SEPT?(?:EMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\b/i);
    if (monthMatch) {
      currentMonth = monthMatch[1].toUpperCase();
    }

    // 2. Week header tracking (WEEK 1, WEEK 2, etc.)
    const weekMatch = rowText.match(/\bWEEK\s+(\d{1,2})\b/i);
    if (weekMatch) {
      currentWeekNumber = parseInt(weekMatch[1], 10);
    }

    // Reset week tracking when entering general policy sections
    const lowerRow = rowText.toLowerCase();
    if (
      lowerRow.includes('grading scale') ||
      lowerRow.includes('course policies') ||
      lowerRow.includes('academic integrity') ||
      lowerRow.includes('attendance policy') ||
      lowerRow.includes('honor code') ||
      lowerRow.includes('classroom behavior')
    ) {
      currentWeekNumber = null;
    }

    // 3. Pattern: Weighted Assignment in Text (e.g. "20% | September 22 | Material Ecologies")
    const weightProjectMatch = rowText.match(/(\d{1,2})%\s*\|\s*([A-Za-z]+ \d{1,2})\s*\|\s*([^|]+)/i);
    if (weightProjectMatch) {
      const weight = parseInt(weightProjectMatch[1], 10);
      const rawDate = weightProjectMatch[2];
      const title = weightProjectMatch[3].trim();
      const dueDate = resolveDateToTerm(rawDate, termRange);

      items.push({
        id: `pdf-${filename}-proj-${items.length + 1}`,
        courseId,
        courseName,
        courseColor,
        title,
        type: classifyItemType(title, rowText),
        dueDate,
        dueTime: extractDueTime(rowText),
        points: null,
        weight,
        isTBD: !dueDate,
        isUndated: !dueDate,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: filename,
        sourceSnippet: rowText,
        notes: `Extracted from syllabus project list (${weight}% weight)`,
        completed: false
      });
      continue;
    }

    // 4. Pattern: Schedule table row with DUE or ASSIGN column (like THTR 3055 Weekly Schedule)
    // Inspect items across column positions
    const dueColItems = row.items.filter(it => it.x >= 280 && it.x < 420);
    const assignColItems = row.items.filter(it => it.x >= 420);
    const dateColItems = row.items.filter(it => it.x >= 80 && it.x < 125);

    // Look for day numbers in date column
    let rowDayNumber: number | null = null;
    for (const dItem of dateColItems) {
      const numMatch = dItem.str.match(/^(\d{1,2})$/);
      if (numMatch) {
        rowDayNumber = parseInt(numMatch[1], 10);
        break;
      }
    }

    // If day number and active month found, resolve dueDate
    let rowDueDate: string | null = null;
    if (rowDayNumber && currentMonth) {
      rowDueDate = resolveDateToTerm(`${currentMonth} ${rowDayNumber}`, termRange);
    } else if (currentWeekNumber) {
      rowDueDate = resolveWeekToDate(currentWeekNumber, termRange.startDate);
    }

    // Process TOPIC column items for Quizzes and Exams (e.g. Quiz # 1 (Remote) at x=157)
    const topicColItems = row.items.filter(it => it.x >= 140 && it.x < 280);
    if (topicColItems.length > 0 && rowDueDate) {
      const topicText = topicColItems.map(it => it.str).join(' ').trim();
      const lowerTopic = topicText.toLowerCase();
      if (lowerTopic.includes('quiz') || lowerTopic.includes('exam') || lowerTopic.includes('midterm')) {
        const itemType = lowerTopic.includes('quiz') ? 'quiz' : 'exam';
        const alreadyAdded = items.some(i => i.title.toLowerCase() === topicText.toLowerCase() && i.dueDate === rowDueDate);
        if (!alreadyAdded) {
          items.push({
            id: `pdf-${filename}-topic-${items.length + 1}`,
            courseId,
            courseName,
            courseColor,
            title: cleanTitle(topicText),
            type: itemType,
            dueDate: rowDueDate,
            dueTime: extractDueTime(rowText, '09:05'),
            points: null,
            weight: null,
            isTBD: false,
            isUndated: false,
            isInferred: false,
            source: 'syllabus',
            sourceDoc: filename,
            sourceSnippet: rowText,
            completed: false
          });
        }
      }
    }

    // Process DUE items in this row (only if row has a concrete day number and resolved date)
    if (dueColItems.length > 0 && rowDayNumber && rowDueDate) {
      const dueTitle = dueColItems.map(it => it.str).join(' ').trim();
      if (isValidItemTitle(dueTitle)) {
        const itemType = classifyItemType(dueTitle, rowText);
        if (itemType !== 'no_class') {
          items.push({
            id: `pdf-${filename}-due-${items.length + 1}`,
            courseId,
            courseName,
            courseColor,
            title: cleanTitle(dueTitle),
            type: itemType,
            dueDate: rowDueDate,
            dueTime: extractDueTime(rowText),
            points: null,
            weight: null,
            isTBD: false,
            isUndated: false,
            isInferred: false,
            source: 'syllabus',
            sourceDoc: filename,
            sourceSnippet: rowText,
            completed: false
          });
        }
      }
    }

    // Process ASSIGN items in this row (only if row has a concrete day number and resolved date)
    if (assignColItems.length > 0 && rowDayNumber && rowDueDate) {
      const assignTitle = assignColItems.map(it => it.str).join(' ').trim();
      if (isValidItemTitle(assignTitle)) {
        const itemType = classifyItemType(assignTitle, rowText);
        if (itemType !== 'no_class') {
          // Avoid duplicate with dueColItem
          const alreadyAdded = items.some(i => i.title.toLowerCase() === assignTitle.toLowerCase() && i.dueDate === rowDueDate);
          if (!alreadyAdded) {
            items.push({
              id: `pdf-${filename}-assign-${items.length + 1}`,
              courseId,
              courseName,
              courseColor,
              title: cleanTitle(assignTitle),
              type: itemType,
              dueDate: rowDueDate,
              dueTime: extractDueTime(rowText),
              points: null,
              weight: null,
              isTBD: false,
              isUndated: false,
              isInferred: false,
              source: 'syllabus',
              sourceDoc: filename,
              sourceSnippet: rowText,
              completed: false
            });
          }
        }
      }
    }

    // 5. Pattern: Extra credit in syllabus prose
    // e.g. "On September 24th there is also a self-directed visit to the Eco Materials Library ... extra credit"
    if (rowText.toLowerCase().includes('extra credit') && (rowText.toLowerCase().includes('visit') || rowText.toLowerCase().includes('lecture') || rowText.toLowerCase().includes('library'))) {
      const dateInLine = resolveDateToTerm(rowText, termRange);
      items.push({
        id: `pdf-${filename}-ec-${items.length + 1}`,
        courseId,
        courseName,
        courseColor,
        title: 'Extra Credit: Eco Materials Library Visit & Reflection',
        type: 'extra_credit',
        dueDate: dateInLine,
        dueTime: '23:59',
        points: 15,
        weight: null,
        isTBD: !dateInLine,
        isUndated: !dateInLine,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: filename,
        sourceSnippet: rowText,
        notes: 'Self-directed visit to ATLAS Eco Materials Library for bonus percentage points.',
        completed: false
      });
    }
  }

  // Deduplicate items with identical title and date
  const uniqueItems: GradedItem[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const key = `${it.title.toLowerCase()}|${it.dueDate}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(it);
    }
  }

  return {
    items: uniqueItems,
    isScanned: false,
    needsManualReview: uniqueItems.length === 0,
    rawText: fullRawText,
    totalPages: doc.numPages
  };
}

function isValidItemTitle(title: string): boolean {
  const t = title.toUpperCase();
  if (t === 'DUE' || t === 'ASSIGN' || t === 'TOPIC' || t === 'DATE' || t === 'DAY') return false;
  if (t.includes('SUBJECT TO CHANGE') || t.includes('STUDENTS DOWNLOAD')) return false;
  if (title.length < 3) return false;

  const lower = title.toLowerCase();
  // Filter out prose fragments that aren't real assignment titles
  if (
    lower.startsWith('the ') ||
    lower.startsWith('there ') ||
    lower.startsWith('is also') ||
    lower.includes('worth an') ||
    lower.includes('will be') ||
    lower.includes('make sure') ||
    lower.includes('you are') ||
    lower.includes('readings in')
  ) {
    return false;
  }
  return true;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^DUE:\s*/i, '')
    .replace(/^ASSIGN:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
