import fs from 'fs';
import { parsePdfDocument } from '../src/parsers/pdfParser.ts';

async function test() {
  console.log('Testing PDF Parser on THTR 3055 Weekly Schedule:');
  const buf = new Uint8Array(fs.readFileSync('./fixtures/THTR 3055 Weekly Sched 08_20_2026.pdf'));
  const res = await parsePdfDocument(
    buf,
    'THTR 3055 Weekly Sched 08_20_2026.pdf',
    '102',
    'THTR 3055: Lighting Design 1'
  );

  console.log(`Parsed ${res.items.length} items from THTR schedule!`);
  console.log('Sample parsed items:');
  res.items.slice(0, 10).forEach(i => {
    console.log(` - [${i.dueDate || 'TBD'} ${i.dueTime || ''}] (${i.type.toUpperCase()}) ${i.title}`);
  });

  console.log('\nTesting PDF Parser on ENVD 4365 Syllabus:');
  const envdBuf = new Uint8Array(fs.readFileSync('./fixtures/F2026_ENVD 4365 Syllabus.pdf'));
  const envdRes = await parsePdfDocument(
    envdBuf,
    'F2026_ENVD 4365 Syllabus.pdf',
    '101',
    'ENVD 4365: Environmental Design Studio'
  );
  console.log(`Parsed ${envdRes.items.length} items from ENVD syllabus!`);
  envdRes.items.forEach(i => {
    console.log(` - [${i.dueDate || 'TBD'}] (${i.type.toUpperCase()}) ${i.title} ${i.weight ? `[${i.weight}%]` : ''}`);
  });
}

test().catch(console.error);
