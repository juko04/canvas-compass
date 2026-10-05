import { GradedItem } from '../types/items';

/**
 * Generates an RFC 5545 compliant iCalendar string with America/Denver timezone
 */
export function generateIcsForItems(items: GradedItem[], calendarTitle: string = 'Canvas Compass'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Canvas Compass//CU Boulder Course Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${cleanIcsText(calendarTitle)}`,
    'X-WR-TIMEZONE:America/Denver',

    // VTIMEZONE for America/Denver (Daylight Savings rules)
    'BEGIN:VTIMEZONE',
    'TZID:America/Denver',
    'X-LIC-LOCATION:America/Denver',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0600',
    'TZNAME:MDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  const nowIcs = formatUtcDateTime(new Date());

  for (const item of items) {
    if (!item.dueDate) continue; // Skip undated or TBD without dates in calendar

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:compass-${item.id}@canvas.colorado.edu`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`SUMMARY:${cleanIcsText(item.title)} [${cleanIcsText(item.courseName.split(':')[0] || item.courseName)}]`);

    let desc = `Course: ${item.courseName}\\nType: ${item.type.toUpperCase()}`;
    if (item.points !== null) desc += `\\nPoints: ${item.points}`;
    if (item.weight !== null) desc += `\\nGrade Weight: ${item.weight}%`;
    if (item.notes) desc += `\\nNotes: ${item.notes}`;
    if (item.sourceDoc) desc += `\\nSource: ${item.sourceDoc}`;
    lines.push(`DESCRIPTION:${cleanIcsText(desc)}`);

    const dateOnly = item.dueDate.replace(/-/g, ''); // YYYYMMDD

    if (item.dueTime) {
      // Timed event (1-hour window)
      const timeParts = item.dueTime.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1] || '0', 10);

      const dtStart = `${dateOnly}T${pad(hours)}${pad(minutes)}00`;
      // End time 1 hour later
      const endHours = (hours + 1) % 24;
      const dtEnd = `${dateOnly}T${pad(endHours)}${pad(minutes)}00`;

      lines.push(`DTSTART;TZID=America/Denver:${dtStart}`);
      lines.push(`DTEND;TZID=America/Denver:${dtEnd}`);
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${dateOnly}`);
    }

    lines.push(`STATUS:${item.completed ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function cleanIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function pad(num: number): string {
  return num < 10 ? '0' + num : String(num);
}

function formatUtcDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
