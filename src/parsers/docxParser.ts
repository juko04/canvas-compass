import JSZip from 'jszip';
import { GradedItem } from '../types/items';
import { TermRange, resolveDateToTerm } from '../api/termAnchors';
import { classifyItemType, extractDueTime } from './classifier';
import { CU_BOULDER_FALL_2026 } from '../api/academicCalendar';

export interface DocxParseResult {
  items: GradedItem[];
  rawText: string;
}

export async function parseDocxDocument(
  fileBytes: Uint8Array,
  filename: string,
  courseId: string,
  courseName: string,
  courseColor: string = '#CFB87C',
  termRange: TermRange = { startDate: CU_BOULDER_FALL_2026.startDate, endDate: CU_BOULDER_FALL_2026.endDate }
): Promise<DocxParseResult> {
  const zip = await JSZip.loadAsync(fileBytes);
  const docXmlFile = zip.file('word/document.xml');

  if (!docXmlFile) {
    throw new Error('Invalid DOCX file: word/document.xml not found');
  }

  const xmlStr = await docXmlFile.async('string');
  const items: GradedItem[] = [];

  // Simple XML tag extraction for text runs <w:t> and table rows <w:tr>
  const textRuns = xmlStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
  const rawWords = textRuns.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  const fullText = rawWords.join(' ');

  // Extract table rows <w:tr>
  const rowMatches = xmlStr.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];

  for (const rowXml of rowMatches) {
    const cellMatches = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
    const cellTexts = cellMatches.map(cell => {
      const runs = cell.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      return runs.map(r => r.replace(/<[^>]+>/g, '').trim()).join(' ');
    });

    if (cellTexts.length >= 2) {
      const dateCandidate = cellTexts[0];
      const descCandidate = cellTexts[1];

      const dueDate = resolveDateToTerm(dateCandidate, termRange);
      if (dueDate && descCandidate && descCandidate.length > 3) {
        items.push({
          id: `docx-${filename}-${items.length + 1}`,
          courseId,
          courseName,
          courseColor,
          title: descCandidate,
          type: classifyItemType(descCandidate),
          dueDate,
          dueTime: extractDueTime(descCandidate),
          points: null,
          weight: null,
          isTBD: false,
          isUndated: false,
          isInferred: false,
          source: 'syllabus',
          sourceDoc: filename,
          notes: 'Extracted from DOCX schedule table',
          completed: false
        });
      }
    }
  }

  return {
    items,
    rawText: fullText
  };
}
