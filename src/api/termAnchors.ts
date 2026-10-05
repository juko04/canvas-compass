import { CU_BOULDER_FALL_2026 } from './academicCalendar';

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

export interface TermRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Resolves yearless dates (e.g. "Sep 9", "9/9", "September 14") to YYYY-MM-DD
 * strictly anchored to the course term dates, ignoring any stale year printed in document
 */
export function resolveDateToTerm(
  rawDateText: string,
  termRange: TermRange = { startDate: CU_BOULDER_FALL_2026.startDate, endDate: CU_BOULDER_FALL_2026.endDate }
): string | null {
  const clean = rawDateText.trim().toLowerCase();

  // Pattern A: "Sep 9", "September 14th", "Aug 24"
  const wordMonthMatch = clean.match(/([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?/);
  if (wordMonthMatch) {
    const monthStr = wordMonthMatch[1];
    const day = parseInt(wordMonthMatch[2], 10);
    const monthNum = MONTH_NAMES[monthStr];

    if (monthNum && day >= 1 && day <= 31) {
      return anchorMonthDayToTerm(monthNum, day, termRange);
    }
  }

  // Pattern B: "9/9", "09/14", "8/24"
  const slashMatch = clean.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const monthNum = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);

    if (monthNum >= 1 && monthNum <= 12 && day >= 1 && day <= 31) {
      return anchorMonthDayToTerm(monthNum, day, termRange);
    }
  }

  return null;
}

/**
 * Given month (1-12) and day, determines the correct year from the term range
 */
export function anchorMonthDayToTerm(month: number, day: number, termRange: TermRange): string {
  const startParts = termRange.startDate.split('-').map(Number);
  const endParts = termRange.endDate.split('-').map(Number);

  const startYear = startParts[0];
  const endYear = endParts[0];
  const startMonth = startParts[1];

  let candidateYear = startYear;
  // If term spans two calendar years (e.g. academic year Aug 2026 - May 2027)
  if (endYear > startYear) {
    if (month < startMonth) {
      candidateYear = endYear;
    }
  }

  const mm = month < 10 ? '0' + month : String(month);
  const dd = day < 10 ? '0' + day : String(day);
  return `${candidateYear}-${mm}-${dd}`;
}

/**
 * Resolves "Week N" to a specific date anchored to term start
 * Week 1 begins on term classes start date (e.g. 2026-08-24)
 */
export function resolveWeekToDate(
  weekNumber: number,
  termStartDateStr: string = CU_BOULDER_FALL_2026.classesStartDate,
  dayOffsetDays: number = 0 // 0 = Monday, 6 = Sunday
): string {
  const start = new Date(termStartDateStr + 'T00:00:00');
  // Add (weekNumber - 1) * 7 days + dayOffsetDays
  const targetTime = start.getTime() + ((weekNumber - 1) * 7 + dayOffsetDays) * 24 * 60 * 60 * 1000;
  const targetDate = new Date(targetTime);

  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  const d = targetDate.getDate();

  const mm = m < 10 ? '0' + m : String(m);
  const dd = d < 10 ? '0' + d : String(d);
  return `${y}-${mm}-${dd}`;
}
