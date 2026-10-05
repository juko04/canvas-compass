import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function inspectScheduleTable(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    console.log(`\n=== PAGE ${pageNum} TABLE RECONSTRUCTION ===`);
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items by Y coordinate (within 3pt threshold)
    const rows = [];
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5]);

      let row = rows.find(r => Math.abs(r.y - y) <= 3.5);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, text: item.str.trim() });
    }

    // Sort rows from top to bottom (Y descending in PDF coordinate space)
    rows.sort((a, b) => b.y - a.y);

    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      const rowLine = r.items.map(it => `[${it.x}] ${it.text}`).join('  |  ');
      console.log(`Y=${r.y}: ${rowLine}`);
    }
  }
}

inspectScheduleTable('./fixtures/THTR 3055 Weekly Sched 08_20_2026.pdf').catch(console.error);
