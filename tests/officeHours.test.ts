import { describe, it, expect } from 'vitest';
import { extractOfficeHoursFromText } from '../src/parsers/officeHoursParser';

describe('Office Hours & Instructor Parser', () => {
  it('extracts instructor, email, office hours, location and zoom from standard syllabus header', () => {
    const syllabusText = `
      ATLS 4519: Learn, Build, Vibe — Fall 2026
      Instructor: Julian Kotara
      Email: julian.kotara@colorado.edu
      Office Hours: Tuesdays and Thursdays 2:00 PM - 3:30 PM
      Room: ATLAS 228
      Zoom Office Hours: https://cuboulder.zoom.us/j/9876543210
    `;

    const result = extractOfficeHoursFromText(syllabusText, 'Learn, Build, Vibe');
    expect(result.instructorName).toBe('Julian Kotara');
    expect(result.email).toBe('julian.kotara@colorado.edu');
    expect(result.officeHours).toContain('Tuesdays and Thursdays 2:00 PM - 3:30 PM');
    expect(result.location).toBe('ATLAS 228');
    expect(result.zoomUrl).toBe('https://cuboulder.zoom.us/j/9876543210');
  });

  it('extracts from Canvas HTML syllabus body with links', () => {
    const htmlBody = `
      <p><strong>Professor:</strong> Dr. Jeremy Spencer</p>
      <p><strong>Contact:</strong> <a href="mailto:jeremy.spencer@colorado.edu">jeremy.spencer@colorado.edu</a></p>
      <p><strong>Student Hours:</strong> Mon/Wed 10:00am - 11:30am in ECCR 244</p>
      <p>Join virtual office hours here: <a href="https://cuboulder.zoom.us/my/spencerlab">Zoom Link</a></p>
    `;

    const result = extractOfficeHoursFromText(htmlBody, 'Environmental Design Studio');
    expect(result.instructorName).toBe('Dr. Jeremy Spencer');
    expect(result.email).toBe('jeremy.spencer@colorado.edu');
    expect(result.officeHours).toContain('Mon/Wed 10:00am - 11:30am');
    expect(result.zoomUrl).toBe('https://cuboulder.zoom.us/my/spencerlab');
  });

  it('ignores Canvas system emails and captures professor email', () => {
    const textWithSystemEmails = `
      For Canvas support, please email canvas@colorado.edu or oithelp@colorado.edu.
      Faculty: Prof. Alice Smith (alice.smith@colorado.edu)
      Office Hours: By appointment or Fridays 1:00 PM – 3:00 PM
    `;

    const result = extractOfficeHoursFromText(textWithSystemEmails);
    expect(result.instructorName).toBe('Prof. Alice Smith');
    expect(result.email).toBe('alice.smith@colorado.edu');
    expect(result.officeHours).toContain('Fridays 1:00 PM – 3:00 PM');
  });

  it('gracefully returns empty object for text with no contact info', () => {
    const emptyText = 'Just course objectives and grading scale. 90-100 is an A.';
    const result = extractOfficeHoursFromText(emptyText);
    expect(result.instructorName).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.zoomUrl).toBeUndefined();
  });

  it('extracts instructor, email, office hours, and appointment link from ENVD 4365 syllabus', () => {
    const envdText = `
      ENVD 4365 | Unearthing Materials Tuesdays and Thursdays | 11:00am – 12: 15pm | ENVD 1 22 
      INSTRUCTOR DETAILS Zannah Matson (she / they) | Assistant Professor | zannah.matson@colorado.edu 
      Office Hours | Tuesday 4:00 - 5:00pm | Virtual + In - person sign - up: https://calendly.com/zannahmae
    `;
    const result = extractOfficeHoursFromText(envdText, 'Unearthing Materials');
    expect(result.instructorName).toBe('Zannah Matson');
    expect(result.email).toBe('zannah.matson@colorado.edu');
    expect(result.officeHours).toBe('Tuesday 4:00 - 5:00pm');
    expect(result.zoomUrl).toBe('https://calendly.com/zannahmae');
  });

  it('supports Google Calendar appointments and Microsoft Bookings URLs', () => {
    const textGCal = `
      Instructor: Dr. Alex Rivera (he / him)
      Email: a.rivera@colorado.edu
      Student Drop-in Hours: Thursdays 2:00pm - 4:00pm
      Appointments: https://calendar.app.google/xyz789appointment
    `;
    const resGCal = extractOfficeHoursFromText(textGCal);
    expect(resGCal.instructorName).toBe('Dr. Alex Rivera');
    expect(resGCal.zoomUrl).toBe('https://calendar.app.google/xyz789appointment');
    expect(resGCal.officeHours).toBe('Thursdays 2:00pm - 4:00pm');

    const textMs = `
      Lead Instructor: Sarah Connor
      Email: sarah.connor@colorado.edu
      Office Hours: Mondays 10am - 12pm
      Booking Link: https://outlook.office365.com/book/profconnor@colorado.edu/
    `;
    const resMs = extractOfficeHoursFromText(textMs);
    expect(resMs.instructorName).toBe('Sarah Connor');
    expect(resMs.zoomUrl).toBe('https://outlook.office365.com/book/profconnor@colorado.edu/');
  });
});
