import { CourseOfficeHours } from '../types/items';

const IGNORED_EMAILS = new Set([
  'canvas@colorado.edu',
  'help@colorado.edu',
  'support@colorado.edu',
  'oit@colorado.edu',
  'oithelp@colorado.edu',
  'admissions@colorado.edu',
  'registrar@colorado.edu',
  'cureport@colorado.edu',
  'honor@colorado.edu',
  'disabilityservices@colorado.edu',
  'noreply@colorado.edu',
  'noreply@canvas.colorado.edu'
]);

/**
 * Extracts instructor details, office hours, Zoom link, and room location
 * from raw syllabus text, HTML body, or page content.
 */
export function extractOfficeHoursFromText(rawTextOrHtml: string, _courseName?: string): CourseOfficeHours {
  if (!rawTextOrHtml || rawTextOrHtml.trim().length === 0) {
    return {};
  }

  // Normalize text: replace multiple spaces, decode basic entities
  const cleanText = rawTextOrHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ');

  const result: CourseOfficeHours = {};

  // 1. Meeting URL: Zoom, Google Meet, Calendly, Microsoft Bookings, Google Calendar Appointments
  // Check rawTextOrHtml to capture <a href="..."> attributes as well as plain URLs
  const meetingRegex = /(https?:\/\/(?:(?:[a-zA-Z0-9-]+\.)?zoom\.us\/(?:j\/|my\/|w\/)[a-zA-Z0-9?=_&%-]+|meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}|(?:www\.)?calendly\.com\/[a-zA-Z0-9_/-]+|calendar\.app\.google\/[a-zA-Z0-9_/-]+|calendar\.google\.com\/[a-zA-Z0-9_/?=&@.-]+|outlook\.office(?:365)?\.com\/[a-zA-Z0-9_/?=&@.-]+)[a-zA-Z0-9?=_&%@.-]*)/i;
  const meetMatch = rawTextOrHtml.match(meetingRegex);
  if (meetMatch) {
    result.zoomUrl = cleanTextSanitizeUrl(meetMatch[1]);
  }

  // 2. Instructor Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@(?:colorado\.edu|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/gi;
  const emails = Array.from(cleanText.matchAll(emailRegex));
  for (const m of emails) {
    const candidate = m[1].toLowerCase().trim();
    if (!IGNORED_EMAILS.has(candidate) && !candidate.startsWith('no-reply') && !candidate.startsWith('info@')) {
      result.email = candidate;
      break;
    }
  }

  // 3. Instructor Name
  const instructorRegex = /(?:Instructor|Professor|Prof\.|Faculty|Teacher|Lecturer|Lead\s*Instructor)[\t :–—|-]+([A-Z][a-zA-Z.'-]+(?:[ \t]+[A-Z][a-zA-Z.'-]+){1,3})/i;
  const instMatch = cleanText.match(instructorRegex);
  if (instMatch) {
    let rawName = instMatch[1].trim();
    // Strip leading descriptor keywords like DETAILS, INFO, INFORMATION, NAME, CONTACT, BIO
    rawName = rawName.replace(/^(?:DETAILS|INFO|INFORMATION|NAME|CONTACT|BIO)\s+/i, '');
    // Strip trailing pronouns or parenthesis notes like (she / they)
    rawName = rawName.replace(/\s*\([a-z\s/]+\)\s*$/i, '');
    rawName = rawName.split(/[\r\n|]|(?:\s+(?:Email|Office|Contact|Phone|Room)\b)/i)[0].trim();
    if (!isDisallowedName(rawName)) {
      result.instructorName = rawName;
    }
  }

  // 4. Office Hours Times
  const hoursRegex = /(?:Office\s*Hours|Student\s*(?:Drop-in\s*)?Hours|Help\s*Hours|Consultation\s*Hours|Drop-in\s*Hours|Student\s*Drop-in(?:\s*Hours)?)[\t :–—|-]+([^\n\r]{4,110})/i;
  const hoursMatch = cleanText.match(hoursRegex);
  if (hoursMatch) {
    let rawHours = hoursMatch[1].trim();
    rawHours = rawHours.replace(/^Hours[:\s–—-]+/i, '').trim();
    // Cut off if followed by Virtual / In-person / Sign-up / Calendly / URL / Room / Location / Zoom
    rawHours = rawHours.split(/(?:\s*\|\s*(?:Virtual|In\s*-\s*person|Sign|https?:\/\/|Room|Location|Zoom|By appointment\b))/i)[0].trim();
    rawHours = rawHours.split(/(?:https?:\/\/|sign\s*-\s*up)/i)[0].trim();
    rawHours = rawHours.split(/[;]|\b(?:in|at|room)\s+[A-Z]{2,4}\b/i)[0].trim();
    rawHours = rawHours.replace(/[|–—\s]+$/, '').trim();
    if (rawHours.length >= 4 && !rawHours.toLowerCase().includes('tbd')) {
      result.officeHours = rawHours;
    }
  }

  // 5. Office Location / Room
  const locationRegex = /(?:Office\s*(?:Location|Room)|Location|Room)[\s:–—|-]+([A-Z]{2,5}\s*[0-9]{2,4}[A-Za-z]?|[A-Za-z0-9\s,]{4,45}(?:Hall|Building|Center|ECCR|ATLS|DLC|CSEL|DUAN|MCDB|HUEN|STAD|VAC|MUEN|HALE|Visual\s*Arts))/i;
  const locMatch = cleanText.match(locationRegex);
  if (locMatch) {
    const rawLoc = locMatch[1].trim();
    if (rawLoc.length >= 3 && !rawLoc.toLowerCase().includes('canvas') && !rawLoc.toLowerCase().includes('online')) {
      result.location = rawLoc;
    }
  }

  return result;
}

function cleanTextSanitizeUrl(url: string): string {
  return url.replace(/[.,;)\]>]+$/, '').trim();
}

function isDisallowedName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('syllabus') ||
    lower.includes('university') ||
    lower.includes('colorado') ||
    lower.includes('boulder') ||
    lower.includes('department') ||
    lower.includes('overview') ||
    lower.includes('schedule') ||
    lower.includes('fall') ||
    lower.includes('spring') ||
    lower.includes('credit')
  );
}
