import { describe, it, expect } from 'vitest';
import { mergeCourseItems, calculateTitleSimilarity } from '../src/merge/merger';
import { GradedItem } from '../src/types/items';

describe('Merger and Conflict Resolution', () => {
  it('correctly calculates title similarity with normalized tokens', () => {
    expect(calculateTitleSimilarity('Quiz 1 (Remote)', 'Canvas Quiz #1')).toBeGreaterThan(0.5);
    expect(calculateTitleSimilarity('Studio Cycle 05 Artifact', 'Cycle 5 Assignment')).toBeGreaterThan(0.5);
    expect(calculateTitleSimilarity('Midterm Exam', 'Final Project Presentation')).toBeLessThan(0.4);
  });

  it('merges Canvas authoritative date while preserving syllabus notes and detects conflicts', () => {
    const canvasItem: GradedItem = {
      id: 'c-1',
      courseId: '101',
      courseName: 'ENVD 4365',
      courseColor: '#007A87',
      title: 'Material Ecologies Drawing Board',
      type: 'assignment',
      dueDate: '2026-09-24', // Canvas moved date by 2 days
      dueTime: '23:59',
      points: 50,
      weight: null,
      isTBD: false,
      isUndated: false,
      isInferred: false,
      source: 'canvas',
      completed: false
    };

    const syllabusItem: GradedItem = {
      id: 's-1',
      courseId: '101',
      courseName: 'ENVD 4365',
      courseColor: '#007A87',
      title: 'Material Ecologies',
      type: 'assignment',
      dueDate: '2026-09-22', // Syllabus date
      dueTime: '10:00',
      points: null,
      weight: 20,
      isTBD: false,
      isUndated: false,
      isInferred: false,
      source: 'syllabus',
      sourceDoc: 'syllabus.pdf',
      notes: 'Investigate material properties across scales.',
      completed: false
    };

    const customItem: GradedItem = {
      id: 'cust-1',
      courseId: '101',
      courseName: 'ENVD 4365',
      courseColor: '#007A87',
      title: 'Buy Blue Book and Foam Core at CU Bookstore',
      type: 'assignment',
      dueDate: '2026-09-20',
      dueTime: '17:00',
      points: null,
      weight: null,
      isTBD: false,
      isUndated: false,
      isInferred: false,
      source: 'custom',
      completed: false
    };

    const result = mergeCourseItems([canvasItem], [syllabusItem], [customItem]);

    expect(result.mergedItems.length).toBe(2); // 1 merged + 1 custom (syllabus item was merged into canvas item, not duplicated!)
    expect(result.canvasItemsMatched).toBe(1);
    expect(result.conflictsFound).toBe(1);

    const merged = result.mergedItems.find(i => i.id === 'c-1');
    expect(merged).toBeDefined();
    // Canvas is authoritative for date and points
    expect(merged?.dueDate).toBe('2026-09-24');
    expect(merged?.points).toBe(50);
    // Syllabus filled weight and notes
    expect(merged?.weight).toBe(20);
    expect(merged?.notes).toContain('Investigate material properties across scales.');
    // Conflict flagged
    expect(merged?.hasConflict).toBe(true);
    expect(merged?.conflictDetails?.field).toBe('Due Date');
    expect(merged?.conflictDetails?.canvasValue).toContain('2026-09-24');
    expect(merged?.conflictDetails?.syllabusValue).toContain('2026-09-22');

    // Custom item preserved untouched
    const custom = result.mergedItems.find(i => i.id === 'cust-1');
    expect(custom).toBeDefined();
    expect(custom?.source).toBe('custom');
  });
});
