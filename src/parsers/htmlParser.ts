import { GradedItem } from '../types/items';
import { TermRange, resolveDateToTerm, resolveWeekToDate } from '../api/termAnchors';
import { extractDueTime } from './classifier';
import { CU_BOULDER_FALL_2026 } from '../api/academicCalendar';

export interface HtmlParseResult {
  items: GradedItem[];
  rawText: string;
  gradingWeights?: Record<string, number>;
}

export function parseSyllabusTextOrHtml(
  content: string,
  courseId: string,
  courseName: string,
  courseColor: string = '#8E44AD',
  termRange: TermRange = { startDate: CU_BOULDER_FALL_2026.startDate, endDate: CU_BOULDER_FALL_2026.endDate }
): HtmlParseResult {
  // Strip RTF control codes or HTML tags to get readable plain text lines
  const cleanLines = extractCleanLines(content);
  const fullText = cleanLines.join('\n');
  const items: GradedItem[] = [];

  // 1. Detect recurring weekly rhythms across lines
  // e.g. "Weekly submissions (artifact + reflection) are due in Canvas by \n Sunday at midnight (11:59 PM)"
  const recurringRuleMatch = fullText.match(/weekly submissions[\s\S]*?due.*?in Canvas by[\s\S]*?Sunday[\s\S]*?midnight/i) ||
                             fullText.match(/weekly submissions[\s\S]*?Sunday[\s\S]*?11:59/i);

  if (recurringRuleMatch) {
    const dueTime = extractDueTime(recurringRuleMatch[0], '23:59');

    // Expand 14 weekly cycles starting from term classes start date (2026-08-24)
    // Week 1 Sunday is 2026-08-30 (dayOffset 6 from Monday)
    for (let week = 1; week <= 14; week++) {
      const sundayDate = resolveWeekToDate(week, termRange.startDate, 6);

      // Check if this falls on Thanksgiving / Fall break week (Nov 23-27, 2026)
      // Nov 29 is the Sunday following Fall Break
      const isBreakWeek = CU_BOULDER_FALL_2026.holidays.some(h => {
        const hTime = new Date(h.date).getTime();
        const sTime = new Date(sundayDate).getTime();
        // Within 6 days of holiday
        return Math.abs(sTime - hTime) < 5 * 24 * 60 * 60 * 1000 && h.name.includes('Fall Break');
      });

      if (isBreakWeek) {
        // Skip break week
        continue;
      }

      items.push({
        id: `html-recurring-w${week}`,
        courseId,
        courseName,
        courseColor,
        title: `Studio Cycle ${pad(week)}: Weekly Artifact & Reflection`,
        type: 'assignment',
        dueDate: sundayDate,
        dueTime,
        points: 10,
        weight: Math.round(50 / 12), // 50% split across weekly cycles
        isTBD: false,
        isUndated: false,
        isInferred: true,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: recurringRuleMatch[0],
        notes: 'Artifact (4pts), Reflection (3pts), Studio Share (3pts). Due Sunday before Monday class.',
        completed: false
      });
    }
  }

  // 2. Parse milestones & key dates from the calendar
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    // Check for "Week one assignment: intention baseline" -> Sunday, August 30, 11:59 PM
    if (line.toLowerCase().includes('intention baseline') || line.toLowerCase().includes('week one assignment')) {
      const context = cleanLines.slice(i, i + 10).join(' ');
      const dueMatch = context.match(/Due:\s*Sunday,\s*([A-Za-z]+ \d{1,2})/i);
      const rawDate = dueMatch ? dueMatch[1] : 'August 30';
      const dueDate = resolveDateToTerm(rawDate, termRange);

      items.push({
        id: `html-milestone-w1`,
        courseId,
        courseName,
        courseColor,
        title: 'Week 1 Assignment: Intention Baseline',
        type: 'assignment',
        dueDate,
        dueTime: '23:59',
        points: 10,
        weight: 5,
        isTBD: false,
        isUndated: false,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: context.slice(0, 140),
        notes: 'Three paragraphs in your own voice on your current relationship with AI and intentions.',
        completed: false
      });
    }

    // Check for "Final project proposals" -> Nov 9
    if (line.toLowerCase().includes('final project proposals') || line.toLowerCase().includes('proposals')) {
      const dueDate = resolveDateToTerm('Nov 9', termRange);
      items.push({
        id: `html-milestone-proposal`,
        courseId,
        courseName,
        courseColor,
        title: 'Final Project Proposal & Brief',
        type: 'project',
        dueDate,
        dueTime: '23:59',
        points: 25,
        weight: 5,
        isTBD: false,
        isUndated: false,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: line,
        notes: 'Proposal outline + tech stack or medium selection.',
        completed: false
      });
    }

    // Check for "Showcase night 1" -> Nov 30
    if (line.toLowerCase().includes('showcase night 1') || line.toLowerCase().includes('november 30')) {
      const dueDate = resolveDateToTerm('Nov 30', termRange);
      items.push({
        id: `html-milestone-showcase1`,
        courseId,
        courseName,
        courseColor,
        title: 'Final Project Showcase — Night 1 Demo',
        type: 'presentation',
        dueDate,
        dueTime: '18:00',
        points: 50,
        weight: 15,
        isTBD: false,
        isUndated: false,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: line,
        notes: 'Culminating artifact live demo (~10 demos per night).',
        completed: false
      });
    }

    // Check for "Showcase night 2" -> Dec 4
    if (line.toLowerCase().includes('showcase night 2') || line.toLowerCase().includes('december 4')) {
      const dueDate = resolveDateToTerm('Dec 4', termRange);
      items.push({
        id: `html-milestone-showcase2`,
        courseId,
        courseName,
        courseColor,
        title: 'Final Project Showcase — Night 2 Demo',
        type: 'presentation',
        dueDate,
        dueTime: '18:00',
        points: 50,
        weight: 15,
        isTBD: false,
        isUndated: false,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: line,
        notes: 'Showcase Night 2 on campus Monday schedule.',
        completed: false
      });
    }

    // Check for "written reflection due exam week" -> TBD
    if (line.toLowerCase().includes('written reflection due exam week') || line.toLowerCase().includes('reflection, due during exam week')) {
      items.push({
        id: `html-milestone-final-reflection`,
        courseId,
        courseName,
        courseColor,
        title: 'Final Learning Reflection (Baseline Comparison)',
        type: 'assignment',
        dueDate: null,
        dueTime: null,
        points: 25,
        weight: 5,
        isTBD: true,
        isUndated: false,
        isInferred: false,
        source: 'syllabus',
        sourceDoc: 'Canvas Syllabus Page',
        sourceSnippet: line,
        notes: 'Due during exam week (Dec 7-11). Exact date depends on official exam schedule.',
        completed: false
      });
    }
  }

  // Deduplicate
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
    rawText: fullText
  };
}

function extractCleanLines(content: string): string[] {
  let text = content;
  if (content.startsWith('{\\rtf') || content.includes('\\ansi')) {
    // Strip RTF control words
    text = content
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\cell/g, '\t')
      .replace(/\\row/g, '\n')
      .replace(/\\[a-zA-Z]+-?\d* ?/g, ' ')
      .replace(/[{}]/g, ' ')
      .replace(/\\'96/g, '–')
      .replace(/\\'97/g, '—')
      .replace(/\\'91|\\'92/g, "'")
      .replace(/\\'93|\\'94/g, '"');
  } else {
    // Strip HTML
    text = content
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
  }

  return text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0);
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
