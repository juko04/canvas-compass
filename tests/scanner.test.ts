import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from '../src/storage/store';
import { scanCourse } from '../src/api/scanner';
import { canvasApi } from '../src/api/canvasClient';
import { CanvasCourse } from '../src/types/canvas';

describe('Canvas Scanner Orchestrator', () => {
  beforeEach(() => {
    // Reset store state
    store.clearMockItems();
  });

  it('skips scanning muted / untracked courses', async () => {
    const course: CanvasCourse = {
      id: 999,
      name: 'TA Course: Computer Science 101',
      course_code: 'CS 101',
      enrollment_term_id: 202607
    };

    // Mute course
    store.updateSettings({ disabledCourseIds: ['999'] });
    expect(store.isCourseTracked('999')).toBe(false);

    const res = await scanCourse(course);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Course is muted');
  });

  it('handles demo fixture courses by loading sample items if Canvas API 404s', async () => {
    const demoCourse: CanvasCourse = {
      id: 101,
      name: 'ENVD 4365: Environmental Design Studio',
      course_code: 'ENVD 4365',
      enrollment_term_id: 202607
    };

    // Unmute course if muted
    store.updateSettings({ disabledCourseIds: [] });

    // Mock Canvas API getAssignments to reject with 404 (simulating demo course not existing on real Canvas)
    vi.spyOn(canvasApi, 'getAssignments').mockRejectedValueOnce(new Error('Canvas API error 404 Not Found'));

    const res = await scanCourse(demoCourse);
    expect(res.success).toBe(true);
    expect(res.itemCount).toBeGreaterThan(0);

    // Verify items were loaded for course 101
    const courseItems = store.getState().items.filter(i => i.courseId === '101');
    expect(courseItems.length).toBeGreaterThan(0);

    // Verify scan status was set to success
    const status = store.getState().scanStatuses['101'];
    expect(status).toBeDefined();
    expect(status.status).toBe('success');
    expect(status.itemsExtracted).toBeGreaterThan(0);

    // Verify office hours and zoom link were recorded
    const oh = store.getState().officeHours['101'];
    expect(oh).toBeDefined();
    expect(oh?.instructorName).toBe('Dr. Jeremy Spencer');
    expect(oh?.zoomUrl).toContain('zoom.us');
  });

  it('preserves user custom items during course scan and merge', async () => {
    const course: CanvasCourse = {
      id: 501,
      name: 'PHYS 1110: General Physics 1',
      course_code: 'PHYS 1110',
      enrollment_term_id: 202607
    };

    store.updateSettings({ disabledCourseIds: [] });

    // Add a custom item by the student
    store.addItem({
      courseId: '501',
      courseName: 'PHYS 1110',
      courseColor: '#2980B9',
      title: 'Study group meeting at Norlin Library',
      type: 'assignment',
      dueDate: '2026-10-12',
      dueTime: '18:00',
      points: null,
      weight: null,
      isTBD: false,
      isUndated: false,
      isInferred: false,
      source: 'custom'
    });

    // Mock Canvas live assignment
    vi.spyOn(canvasApi, 'getAssignments').mockResolvedValueOnce([
      {
        id: 1001,
        course_id: 501,
        name: 'MasteringPhysics Homework 1',
        due_at: '2026-10-15T23:59:00Z',
        points_possible: 20,
        updated_at: '2026-08-20'
      }
    ]);
    vi.spyOn(canvasApi, 'getQuizzes').mockResolvedValueOnce([]);
    vi.spyOn(canvasApi, 'getCourseDetails').mockResolvedValueOnce(course);
    vi.spyOn(canvasApi, 'getFiles').mockResolvedValueOnce([]);
    vi.spyOn(canvasApi, 'getPages').mockResolvedValueOnce([]);

    const res = await scanCourse(course);
    expect(res.success).toBe(true);

    const items = store.getState().items.filter(i => i.courseId === '501');
    // Both custom item and Canvas assignment must exist!
    expect(items.some(i => i.title.includes('Study group meeting'))).toBe(true);
    expect(items.some(i => i.title.includes('MasteringPhysics Homework 1'))).toBe(true);
  });
});
