import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePdfDocument } from '../src/parsers/pdfParser';
import { parseSyllabusTextOrHtml } from '../src/parsers/htmlParser';

describe('Tier 1 Golden Tests on Provided Syllabus Fixtures', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  // Test 1: Combined PDF (F2026_ENVD 4365 Syllabus.pdf)
  it('correctly parses Combined PDF fixture (ENVD 4365)', async () => {
    const filePath = path.join(fixturesDir, 'F2026_ENVD 4365 Syllabus.pdf');
    expect(fs.existsSync(filePath)).toBe(true);

    const pdfBuffer = new Uint8Array(fs.readFileSync(filePath));
    const result = await parsePdfDocument(
      pdfBuffer,
      'F2026_ENVD 4365 Syllabus.pdf',
      '101',
      'ENVD 4365: Environmental Design Studio',
      '#007A87'
    );

    expect(result.isScanned).toBe(false);
    expect(result.items.length).toBeGreaterThan(0);
    console.log('=== ENVD 4365 RAW TEXT START ===');
    console.log(result.rawText.slice(0, 2000));
    console.log('=== ENVD 4365 RAW TEXT END ===');

    // Verify key extracted items:
    // 1. "Material Ecologies" project (20% weight, Sep 22)
    const materialEcologies = result.items.find(i => i.title.includes('Material Ecologies'));
    expect(materialEcologies).toBeDefined();
    expect(materialEcologies?.weight).toBe(20);
    expect(materialEcologies?.dueDate).toBe('2026-09-22');

    // 2. Extra credit ATLAS Eco Materials Library visit
    const extraCredit = result.items.find(i => i.type === 'extra_credit');
    expect(extraCredit).toBeDefined();
    expect(extraCredit?.title).toContain('Eco Materials Library');
  });

  // Test 2: Separate PDFs fixture (THTR 3055 Schedule PDF + Syllabus PDF)
  it('correctly parses separate schedule PDF fixture (THTR 3055)', async () => {
    const schedPath = path.join(fixturesDir, 'THTR 3055 Weekly Sched 08_20_2026.pdf');
    expect(fs.existsSync(schedPath)).toBe(true);

    const pdfBuffer = new Uint8Array(fs.readFileSync(schedPath));
    const result = await parsePdfDocument(
      pdfBuffer,
      'THTR 3055 Weekly Sched 08_20_2026.pdf',
      '102',
      'THTR 3055: Lighting Design 1',
      '#CFB87C'
    );

    expect(result.isScanned).toBe(false);
    expect(result.items.length).toBeGreaterThan(5);

    // Verify Quiz # 1 Remote (Week 4, Sep 11)
    const quiz1 = result.items.find(i => i.title.toLowerCase().includes('quiz # 1') || i.title.toLowerCase().includes('quiz 1'));
    expect(quiz1).toBeDefined();
    expect(quiz1?.dueDate).toBe('2026-09-11');
    expect(quiz1?.type).toBe('quiz');

    // Verify Basic Controls Lab
    const labItem = result.items.find(i => i.title.toLowerCase().includes('basic controls lab'));
    expect(labItem).toBeDefined();

    // Verify Final Cue Project
    const finalCue = result.items.find(i => i.title.toLowerCase().includes('final cue project'));
    expect(finalCue).toBeDefined();
  });

  // Test 3: Canvas Page Text (learnvibebuild Syllabus.rtf)
  it('correctly parses Canvas page text fixture and expands recurring schedule (ATLS 4519)', () => {
    const rtfPath = path.join(fixturesDir, 'learnvibebuild Syllabus.rtf');
    expect(fs.existsSync(rtfPath)).toBe(true);

    const content = fs.readFileSync(rtfPath, 'utf8');
    const result = parseSyllabusTextOrHtml(
      content,
      '103',
      'ATLS 4519: Learn, Build, Vibe',
      '#8E44AD'
    );

    expect(result.items.length).toBeGreaterThan(10);

    // Verify expanded recurring weekly cycles:
    const recurringCycles = result.items.filter(i => i.isInferred && i.title.includes('Studio Cycle'));
    expect(recurringCycles.length).toBeGreaterThanOrEqual(10);

    // All recurring cycles must have Sunday due date at 23:59
    for (const cycle of recurringCycles) {
      expect(cycle.dueTime).toBe('23:59');
      // Ensure Fall Break Sunday is skipped or handled
      expect(cycle.dueDate).not.toBe('2026-11-29');
    }

    // Verify Intention Baseline due Sunday August 30
    const baseline = result.items.find(i => i.title.includes('Intention Baseline'));
    expect(baseline).toBeDefined();
    expect(baseline?.dueDate).toBe('2026-08-30');

    // Verify Final Project Proposal due Nov 9
    const proposal = result.items.find(i => i.title.includes('Proposal'));
    expect(proposal).toBeDefined();
    expect(proposal?.dueDate).toBe('2026-11-09');

    // Verify Showcase Night 1 due Nov 30
    const showcase1 = result.items.find(i => i.title.includes('Showcase') && i.title.includes('Night 1'));
    expect(showcase1).toBeDefined();
    expect(showcase1?.dueDate).toBe('2026-11-30');

    // Verify Final Reflection is TBD
    const finalReflection = result.items.find(i => i.title.includes('Final Learning Reflection'));
    expect(finalReflection).toBeDefined();
    expect(finalReflection?.isTBD).toBe(true);
  });
});
