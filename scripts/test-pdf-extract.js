import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testPdf(pdfPath) {
  console.log(`\n================ Testing ${path.basename(pdfPath)} ================`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  console.log(`Total Pages: ${doc.numPages}`);
  let totalItems = 0;

  for (let pageNum = 1; pageNum <= Math.min(doc.numPages, 4); pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    totalItems += textContent.items.length;
    console.log(`--- Page ${pageNum}: ${textContent.items.length} text items ---`);

    // Sample first 15 items with their x, y coordinates
    const samples = textContent.items.slice(0, 15).map(item => {
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5]);
      return `[x=${x}, y=${y}] "${item.str}"`;
    });
    console.log(samples.join('\n'));
  }

  console.log(`Scanned check: totalItems = ${totalItems}`);
  if (totalItems < 5) {
    console.log(`>>> WARNING: Scanned PDF without text layer detected!`);
  }
}

async function run() {
  const fixtures = [
    './fixtures/F2026_ENVD 4365 Syllabus.pdf',
    './fixtures/THTR 3055 Weekly Sched 08_20_2026.pdf',
    './fixtures/THTR 3055_Lighting Design 1_Spencer_Fall 2026 08_19_26.pdf'
  ];

  for (const f of fixtures) {
    if (fs.existsSync(f)) {
      await testPdf(f);
    }
  }
}

run().catch(console.error);
