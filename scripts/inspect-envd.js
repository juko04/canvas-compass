import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function inspectEnvd(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const fullText = content.items.map(it => it.str).join(' ');

    if (fullText.includes('Schedule') || fullText.includes('Week') || fullText.includes('Grading') || fullText.includes('%')) {
      console.log(`\n=== PAGE ${pageNum} KEYWORD HIT ===`);
      // print text
      console.log(fullText.slice(0, 500));
    }
  }
}

inspectEnvd('./fixtures/F2026_ENVD 4365 Syllabus.pdf').catch(console.error);
