import { ItemType } from '../types/items';

export type DocumentClassification = 'syllabus' | 'schedule' | 'other';

/**
 * Classifies document as syllabus, schedule, or other based on filename and content
 */
export function classifyDocument(filename: string, contentText: string = ''): DocumentClassification {
  const lowerName = filename.toLowerCase();
  const lowerText = contentText.slice(0, 1500).toLowerCase();

  // If filename has schedule or calendar
  if (lowerName.includes('schedule') || lowerName.includes('calendar') || lowerName.includes('sched')) {
    return 'schedule';
  }

  // If filename has syllabus
  if (lowerName.includes('syllabus')) {
    return 'syllabus';
  }

  // Content inspection
  if (lowerText.includes('course calendar') || lowerText.includes('weekly schedule') || lowerText.includes('semester schedule')) {
    return 'schedule';
  }

  if (lowerText.includes('syllabus') || lowerText.includes('course policy') || lowerText.includes('grading scale')) {
    return 'syllabus';
  }

  return 'other';
}

/**
 * Classifies an extracted item title and description into an ItemType
 */
export function classifyItemType(title: string, contextText: string = ''): ItemType {
  const t = title.toLowerCase();

  if (
    t.includes('no class') ||
    t.includes('fall break') ||
    t.includes('labor day') ||
    t.includes('reading day') ||
    t.includes('holiday')
  ) {
    return 'no_class';
  }

  if (t.includes('extra credit') || t.includes('bonus point')) {
    return 'extra_credit';
  }

  if (t.includes('final exam') || t.includes('midterm') || t.includes('exam')) {
    return 'exam';
  }

  if (
    t.includes('showcase') ||
    t.includes('presentation') ||
    t.includes('demo') ||
    t.includes('share') ||
    t.includes('exhibition')
  ) {
    return 'presentation';
  }

  if (
    t.includes('capstone') ||
    t.includes('final project') ||
    t.includes('project') ||
    t.includes('plot') ||
    t.includes('model')
  ) {
    return 'project';
  }

  if (t.includes('quiz')) {
    return 'quiz';
  }

  if (t.includes('lab') || t.includes('workshop')) {
    return 'lab';
  }

  if (t.includes('reading') || t.includes('readings') || t.includes('read')) {
    return 'reading';
  }

  if (t.includes('attendance') || t.includes('participation')) {
    return 'attendance';
  }

  if (t.includes('check in') || t.includes('check-in') || t.includes('review')) {
    return 'checkin';
  }

  // Fallback to checking context text only if title is generic
  const combined = (title + ' ' + contextText).toLowerCase();
  if (combined.includes('quiz')) return 'quiz';
  if (combined.includes('exam')) return 'exam';
  if (combined.includes('project')) return 'project';

  return 'assignment';
}

/**
 * Extracts due time from text phrases like "by 10am", "11:59 PM", "due Sunday at midnight", "start of class"
 */
export function extractDueTime(text: string, defaultTime: string = '23:59'): string {
  const lower = text.toLowerCase();

  if (lower.includes('midnight') || lower.includes('11:59')) {
    return '23:59';
  }
  if (lower.includes('noon') || lower.includes('12:00 pm')) {
    return '12:00';
  }
  if (lower.includes('start of class') || lower.includes('in class')) {
    return '09:00'; // Default class morning start
  }

  // Match e.g. "10:00am", "10am", "5:00 pm", "2:30pm"
  const timeMatch = lower.match(/(?:by|at|due\s+at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPm = timeMatch[3].toLowerCase() === 'pm';

    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;

    const hh = hours < 10 ? '0' + hours : String(hours);
    const mm = minutes < 10 ? '0' + minutes : String(minutes);
    return `${hh}:${mm}`;
  }

  return defaultTime;
}

/**
 * Checks for explicit negative statements in syllabus text
 * e.g. "There are no extra credit opportunities"
 */
export function detectExplicitNegatives(text: string): string[] {
  const negatives: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const l = line.toLowerCase();
    if (
      (l.includes('no extra credit') || l.includes('not offer extra credit') || l.includes('there are no extra credit')) &&
      !l.includes('except')
    ) {
      negatives.push('No extra credit opportunities available in this course.');
    }
    if (l.includes('no late work') || l.includes('late work will not be accepted')) {
      negatives.push('Late submissions not accepted.');
    }
  }

  return Array.from(new Set(negatives));
}
