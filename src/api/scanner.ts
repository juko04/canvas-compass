import { CanvasCourse, CourseScanStatus, CanvasAssignment } from '../types/canvas';
import { GradedItem } from '../types/items';
import { store } from '../storage/store';
import { canvasApi } from './canvasClient';
import { parseSyllabusTextOrHtml } from '../parsers/htmlParser';
import { parsePdfDocument } from '../parsers/pdfParser';
import { parseDocxDocument } from '../parsers/docxParser';
import { mergeCourseItems } from '../merge/merger';
import { CU_BOULDER_FALL_2026 } from './academicCalendar';
import { TermRange } from './termAnchors';
import { GeminiProvider } from '../ai/gemini';
import { MOCK_ITEMS } from '../mock/mockData';
import { extractOfficeHoursFromText } from '../parsers/officeHoursParser';

const COLOR_PALETTE = [
  '#007A87', // CU Teal
  '#CFB87C', // CU Gold
  '#8E44AD', // Purple
  '#2980B9', // Ocean Blue
  '#D35400', // Rust Orange
  '#27AE60', // Emerald Green
  '#C0392B', // Crimson
  '#16A085'  // Sea Green
];

function getCourseColor(courseId: number, index: number, existingColor?: string): string {
  if (existingColor) return existingColor;
  return COLOR_PALETTE[Math.abs(courseId || index) % COLOR_PALETTE.length];
}

function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>/g, ' ');
}

/**
 * 1. Synchronizes favorited courses from the active Canvas REST session
 */
export async function syncCoursesFromCanvas(forceRescan = false): Promise<CanvasCourse[]> {
  store.addLog('api', 'info', `Querying Canvas REST API for favorited courses (${canvasApi.getHost()})...`);
  try {
    const courses = await canvasApi.getFavoriteOrActiveCourses();
    if (Array.isArray(courses) && courses.length > 0) {
      const mappedCourses: CanvasCourse[] = courses.map((c, idx) => ({
        ...c,
        color: getCourseColor(c.id, idx, c.color)
      }));

      store.setCourses(mappedCourses);
      store.addLog('api', 'info', `Synced ${mappedCourses.length} active/favorited courses from Canvas.`);

      if (forceRescan) {
        await scanAllCourses();
      }
      return mappedCourses;
    } else {
      store.addLog('api', 'warn', 'No favorited or active courses returned by Canvas API.');
      return store.getState().courses;
    }
  } catch (err: any) {
    store.addLog(
      'api',
      'warn',
      `Could not sync courses from Canvas: ${err.message}. Using current courses list.`
    );
    return store.getState().courses;
  }
}

/**
 * 2. Scans a single Canvas course: assignments, quizzes, syllabus_body, PDF/DOCX files, pages, and merges them
 */
export async function scanCourse(course: CanvasCourse): Promise<{ success: boolean; itemCount: number; error?: string }> {
  const courseIdStr = String(course.id);

  if (!store.isCourseTracked(courseIdStr)) {
    store.addLog('api', 'info', `Skipping muted course ${course.name}`, undefined, courseIdStr);
    return { success: false, itemCount: 0, error: 'Course is muted' };
  }

  // Set scanning state in UI
  store.updateCourseScanStatus({
    courseId: courseIdStr,
    courseName: course.name,
    courseColor: course.color,
    status: 'scanning',
    message: `Scanning files and assignments for ${course.name}...`,
    docsFound: 0,
    itemsExtracted: 0
  });
  store.addLog('api', 'info', `Initiated scan for ${course.name} (ID: ${course.id})`, undefined, courseIdStr);

  const termRange: TermRange = {
    startDate: course.term?.start_at ? course.term.start_at.split('T')[0] : CU_BOULDER_FALL_2026.startDate,
    endDate: course.term?.end_at ? course.term.end_at.split('T')[0] : CU_BOULDER_FALL_2026.endDate
  };

  const isDemoCourse = (course.id === 101 || course.id === 102 || course.id === 103);
  let assignments: CanvasAssignment[] = [];

  // Step A: Fetch Live Canvas Assignments
  try {
    assignments = await canvasApi.getAssignments(course.id);
    store.addLog('api', 'info', `Retrieved ${assignments.length} live assignments from Canvas REST API.`, undefined, courseIdStr);
  } catch (assignErr: any) {
    // If this is a demo fixture course and Canvas returned 404 / 401, provide friendly fallback
    if (isDemoCourse) {
      store.addLog(
        'api',
        'warn',
        `Course ID ${course.id} is a demo fixture course (${assignErr.message}). Loaded sample items from fixture dataset.`,
        undefined,
        courseIdStr
      );
      const sampleItems = MOCK_ITEMS.filter(i => i.courseId === courseIdStr);
      store.replaceCourseItems(courseIdStr, sampleItems);

      // Seed realistic demo office hours if not set
      if (!store.getState().officeHours?.[courseIdStr]) {
        if (courseIdStr === '101') {
          store.setOfficeHours('101', {
            instructorName: 'Dr. Jeremy Spencer',
            email: 'jeremy.spencer@colorado.edu',
            officeHours: 'Tuesdays & Thursdays 1:00 PM – 2:30 PM',
            zoomUrl: 'https://cuboulder.zoom.us/j/9876543210',
            location: 'ENVD 234'
          });
        } else if (courseIdStr === '102') {
          store.setOfficeHours('102', {
            instructorName: 'Prof. Christopher Spencer',
            email: 'c.spencer@colorado.edu',
            officeHours: 'Mondays & Wednesdays 3:00 PM – 4:30 PM',
            zoomUrl: 'https://cuboulder.zoom.us/j/1234567890',
            location: 'University Theatre 204'
          });
        } else if (courseIdStr === '103') {
          store.setOfficeHours('103', {
            instructorName: 'Julian Kotara',
            email: 'julian.kotara@colorado.edu',
            officeHours: 'Fridays 11:00 AM – 1:00 PM',
            zoomUrl: 'https://cuboulder.zoom.us/j/5551234567',
            location: 'ATLAS 228'
          });
        }
      }

      store.updateCourseScanStatus({
        courseId: courseIdStr,
        courseName: course.name,
        courseColor: course.color,
        status: 'success',
        docsFound: 1,
        itemsExtracted: sampleItems.length,
        lastScanned: new Date().toISOString(),
        message: `Sample fixture items loaded (${sampleItems.length} items). Sync favorites to pull your real Canvas courses.`
      });
      return { success: true, itemCount: sampleItems.length };
    }

    store.addLog('api', 'warn', `Failed fetching Canvas assignments: ${assignErr.message}`, undefined, courseIdStr);
  }

  const canvasItems: GradedItem[] = canvasApi.mapAssignmentsToGradedItems(assignments, course);

  // Step B: Canvas Quizzes
  try {
    const quizzes = await canvasApi.getQuizzes(course.id);
    if (Array.isArray(quizzes) && quizzes.length > 0) {
      store.addLog('api', 'info', `Retrieved ${quizzes.length} quizzes from Canvas`, undefined, courseIdStr);
      for (const q of quizzes) {
        const alreadyHas = canvasItems.some(ci => ci.title.toLowerCase() === (q.title || '').toLowerCase());
        if (!alreadyHas && q.title) {
          let dueDate: string | null = null;
          let dueTime: string | null = null;
          if (q.due_at) {
            const d = new Date(q.due_at);
            dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dueTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
          canvasItems.push({
            id: `canvas-quiz-${q.id}`,
            courseId: courseIdStr,
            courseName: course.name,
            courseColor: course.color || '#CFB87C',
            title: q.title,
            type: 'quiz',
            dueDate,
            dueTime,
            points: q.points_possible || null,
            weight: null,
            isTBD: !q.due_at,
            isUndated: !q.due_at,
            isInferred: false,
            source: 'canvas',
            sourceDoc: 'Canvas Quizzes API',
            notes: q.description ? stripHtml(q.description).slice(0, 160) : undefined,
            completed: false
          });
        }
      }
    }
  } catch (quizErr: any) {
    store.addLog('api', 'debug', `Quizzes check skipped: ${quizErr.message}`, undefined, courseIdStr);
  }

  // Step C: Syllabus Candidate Documents
  const syllabusItems: GradedItem[] = [];
  let docCount = 0;
  let combinedRawText = '';

  // 1. Course Details & syllabus_body
  try {
    const details = await canvasApi.getCourseDetails(course.id);
    if (details.syllabus_body && details.syllabus_body.trim().length > 20) {
      docCount++;
      store.addLog('api', 'info', `Found Canvas syllabus_body (${details.syllabus_body.length} characters). Parsing...`, undefined, courseIdStr);
      const htmlResult = parseSyllabusTextOrHtml(
        details.syllabus_body,
        courseIdStr,
        course.name,
        course.color,
        termRange
      );
      syllabusItems.push(...htmlResult.items);
      combinedRawText += '\n' + htmlResult.rawText;
      store.addLog('api', 'info', `Extracted ${htmlResult.items.length} items from Canvas syllabus_body.`, undefined, courseIdStr);

      // Check if syllabus_body contains a file download link (e.g. /files/12345/download)
      const fileIdMatch = details.syllabus_body.match(/\/files\/(\d+)(?:\/download|\?|$)/i);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        try {
          const fileInfo = await canvasApi.getFile(fileId);
          if (fileInfo && fileInfo.url) {
            docCount++;
            store.addLog('api', 'info', `Found syllabus file linked in syllabus_body: "${fileInfo.display_name}"`, undefined, courseIdStr);
            const bytes = await canvasApi.downloadFileBytes(fileInfo.url);
            if ((fileInfo.display_name || '').toLowerCase().endsWith('.pdf') || fileInfo['content-type'] === 'application/pdf') {
              const pdfRes = await parsePdfDocument(bytes, fileInfo.display_name, courseIdStr, course.name, course.color, termRange);
              syllabusItems.push(...pdfRes.items);
              combinedRawText += '\n' + pdfRes.rawText;
              store.addLog('api', 'info', `Parsed linked syllabus PDF "${fileInfo.display_name}": ${pdfRes.items.length} items extracted.`, undefined, courseIdStr);
            }
          }
        } catch (linkFileErr: any) {
          store.addLog('api', 'debug', `Linked syllabus file download skipped: ${linkFileErr.message}`, undefined, courseIdStr);
        }
      }
    }
  } catch (detailsErr: any) {
    store.addLog('api', 'debug', `Course details check skipped: ${detailsErr.message}`, undefined, courseIdStr);
  }

  // 2. Course Files (PDF / DOCX syllabi and schedules)
  try {
    const files = await canvasApi.getFiles(course.id);
    if (Array.isArray(files) && files.length > 0) {
      const candidates = files.filter(f => {
        const name = (f.display_name || f.filename || '').toLowerCase();
        return (
          name.includes('syllabus') ||
          name.includes('sched') ||
          name.includes('calendar') ||
          name.includes('outline') ||
          name.includes('grading') ||
          name.includes('policy')
        );
      });

      const filesToParse = candidates.length > 0
        ? candidates.slice(0, 3)
        : files.filter(f => (f.display_name || '').toLowerCase().endsWith('.pdf')).slice(0, 2);

      for (const file of filesToParse) {
        docCount++;
        store.addLog('api', 'info', `Processing candidate file "${file.display_name}" (${Math.round((file.size || 0) / 1024)} KB)...`, undefined, courseIdStr);
        try {
          const bytes = await canvasApi.downloadFileBytes(file.url);
          const isPdf = (file.display_name || '').toLowerCase().endsWith('.pdf') || file['content-type'] === 'application/pdf';
          const isDocx = (file.display_name || '').toLowerCase().endsWith('.docx');

          if (isPdf) {
            const pdfRes = await parsePdfDocument(
              bytes,
              file.display_name,
              courseIdStr,
              course.name,
              course.color,
              termRange
            );
            syllabusItems.push(...pdfRes.items);
            combinedRawText += '\n' + pdfRes.rawText;
            store.addLog('api', 'info', `Parsed PDF "${file.display_name}": ${pdfRes.items.length} items extracted across ${pdfRes.totalPages} pages.`, undefined, courseIdStr);
            if (pdfRes.needsManualReview) {
              store.addLog('api', 'warn', `"${file.display_name}" appears to be a scanned PDF without text layer. Needs manual review.`, undefined, courseIdStr);
            }
          } else if (isDocx) {
            const docxRes = await parseDocxDocument(
              bytes,
              file.display_name,
              courseIdStr,
              course.name,
              course.color,
              termRange
            );
            syllabusItems.push(...docxRes.items);
            combinedRawText += '\n' + docxRes.rawText;
            store.addLog('api', 'info', `Parsed DOCX "${file.display_name}": ${docxRes.items.length} items extracted.`, undefined, courseIdStr);
          }
        } catch (fileErr: any) {
          store.addLog('api', 'warn', `Could not parse "${file.display_name}": ${fileErr.message}`, undefined, courseIdStr);
        }
      }
    }
  } catch (fileListErr: any) {
    store.addLog('api', 'debug', `Files endpoint skipped: ${fileListErr.message}`, undefined, courseIdStr);
  }

  // 3. Canvas Pages
  try {
    const pages = await canvasApi.getPages(course.id);
    if (Array.isArray(pages) && pages.length > 0) {
      const syllabusPages = pages.filter(p => {
        const t = (p.title || '').toLowerCase();
        return t.includes('syllabus') || t.includes('schedule') || t.includes('calendar');
      });

      for (const sp of syllabusPages.slice(0, 2)) {
        try {
          const pContent = await canvasApi.getPageContent(course.id, sp.url);
          if (pContent.body && pContent.body.length > 30) {
            docCount++;
            const pageRes = parseSyllabusTextOrHtml(pContent.body, courseIdStr, course.name, course.color, termRange);
            syllabusItems.push(...pageRes.items);
            combinedRawText += '\n' + pageRes.rawText;
            store.addLog('api', 'info', `Parsed Canvas Page "${sp.title}": ${pageRes.items.length} items extracted.`, undefined, courseIdStr);
          }
        } catch (pErr: any) {
          store.addLog('api', 'debug', `Page ${sp.url} skipped: ${pErr.message}`, undefined, courseIdStr);
        }
      }
    }
  } catch (pagesErr: any) {
    store.addLog('api', 'debug', `Pages endpoint skipped: ${pagesErr.message}`, undefined, courseIdStr);
  }

  // 4. Canvas Modules (especially when Files or Pages tabs are restricted/403)
  if (docCount === 0 || syllabusItems.length === 0) {
    try {
      const modules = await canvasApi.getModules(course.id);
      if (Array.isArray(modules) && modules.length > 0) {
        for (const mod of modules) {
          if (!Array.isArray(mod.items)) continue;
          for (const item of mod.items) {
            const title = (item.title || '').toLowerCase();
            const isCandidate = title.includes('syllabus') || title.includes('schedule') || title.includes('calendar') || title.includes('outline');
            if (isCandidate && item.type === 'File' && item.content_id) {
              try {
                const fileInfo = await canvasApi.getFile(item.content_id);
                if (fileInfo && fileInfo.url) {
                  docCount++;
                  store.addLog('api', 'info', `Found candidate file in Module "${mod.name}": "${fileInfo.display_name}"`, undefined, courseIdStr);
                  const bytes = await canvasApi.downloadFileBytes(fileInfo.url);
                  if ((fileInfo.display_name || '').toLowerCase().endsWith('.pdf')) {
                    const pdfRes = await parsePdfDocument(bytes, fileInfo.display_name, courseIdStr, course.name, course.color, termRange);
                    syllabusItems.push(...pdfRes.items);
                    combinedRawText += '\n' + pdfRes.rawText;
                    store.addLog('api', 'info', `Parsed PDF from Module: ${pdfRes.items.length} items extracted.`, undefined, courseIdStr);
                  }
                }
              } catch (mfErr: any) {
                store.addLog('api', 'debug', `Module file download skipped: ${mfErr.message}`, undefined, courseIdStr);
              }
            } else if (isCandidate && item.type === 'Page' && item.page_url) {
              try {
                const pContent = await canvasApi.getPageContent(course.id, item.page_url);
                if (pContent.body && pContent.body.length > 30) {
                  docCount++;
                  const pageRes = parseSyllabusTextOrHtml(pContent.body, courseIdStr, course.name, course.color, termRange);
                  syllabusItems.push(...pageRes.items);
                  combinedRawText += '\n' + pageRes.rawText;
                  store.addLog('api', 'info', `Parsed Page from Module "${mod.name}": ${pageRes.items.length} items extracted.`, undefined, courseIdStr);
                }
              } catch (mpErr: any) {
                store.addLog('api', 'debug', `Module page skipped: ${mpErr.message}`, undefined, courseIdStr);
              }
            }
          }
        }
      }
    } catch (modErr: any) {
      store.addLog('api', 'debug', `Modules check skipped: ${modErr.message}`, undefined, courseIdStr);
    }
  }

  // Step D: Tier 2 AI Extraction (Opt-in)
  const settings = store.getState().settings;
  if (settings.aiEnabled && settings.geminiApiKey && combinedRawText.length > 100) {
    try {
      store.addLog('ai', 'info', `Calling Gemini (${settings.geminiModel}) for ${course.name}...`, undefined, courseIdStr);
      const aiProvider = new GeminiProvider(settings.geminiApiKey, settings.geminiModel);
      const aiRes = await aiProvider.extractDeadlines(
        combinedRawText.slice(0, 15000),
        `${course.name} Syllabus Text`,
        courseIdStr,
        course.name,
        termRange
      );
      if (aiRes.items.length > 0) {
        store.addLog('ai', 'info', `Gemini extracted ${aiRes.items.length} items with AI confidence scores.`, undefined, courseIdStr);
        for (const aiItem of aiRes.items) {
          const matchIdx = syllabusItems.findIndex(si =>
            si.dueDate === aiItem.dueDate &&
            si.title.toLowerCase().includes(aiItem.title.toLowerCase().slice(0, 6))
          );
          if (matchIdx >= 0) {
            syllabusItems[matchIdx] = { ...syllabusItems[matchIdx], ...aiItem, source: 'syllabus' };
          } else {
            syllabusItems.push(aiItem);
          }
        }
      }
    } catch (aiErr: any) {
      store.addLog('ai', 'warn', `Tier 2 AI extraction fallback: ${aiErr.message}`, undefined, courseIdStr);
    }
  }

  // Step E: Merge Canvas + Syllabus + User Custom Items
  const existingCustomItems = store.getState().items.filter(i =>
    i.courseId === courseIdStr && (i.source === 'custom' || i.userEdited)
  );

  const mergeResult = mergeCourseItems(canvasItems, syllabusItems, existingCustomItems);

  // Update store items
  store.replaceCourseItems(courseIdStr, mergeResult.mergedItems);

  // Step E.1: Extract Instructor & Office Hours from syllabus text & Canvas API
  try {
    const detectedHours = extractOfficeHoursFromText(combinedRawText, course.name);

    // Fallback check on Canvas instructors endpoint if instructor name or email missing
    if (!detectedHours.instructorName || !detectedHours.email) {
      try {
        const instructors = await canvasApi.getCourseInstructors(course.id);
        if (instructors.length > 0) {
          if (!detectedHours.instructorName && instructors[0].name) {
            detectedHours.instructorName = instructors[0].name;
          }
          if (!detectedHours.email && instructors[0].email) {
            detectedHours.email = instructors[0].email;
          }
        }
      } catch {}
    }

    const existingHours = store.getState().officeHours?.[courseIdStr] || {};
    const finalOfficeHours = {
      instructorName: detectedHours.instructorName || existingHours.instructorName || '',
      email: detectedHours.email || existingHours.email || '',
      officeHours: detectedHours.officeHours || existingHours.officeHours || '',
      zoomUrl: detectedHours.zoomUrl || existingHours.zoomUrl || '',
      location: detectedHours.location || existingHours.location || ''
    };

    if (Object.values(finalOfficeHours).some(Boolean)) {
      store.setOfficeHours(courseIdStr, finalOfficeHours);
      store.addLog(
        'api',
        'info',
        `Synced instructor & office hours for ${course.name}: ${finalOfficeHours.instructorName || 'Instructor'} (${finalOfficeHours.officeHours || finalOfficeHours.zoomUrl || 'Details detected'})`,
        undefined,
        courseIdStr
      );
    }
  } catch (ohErr: any) {
    store.addLog('api', 'warn', `Office hours extraction note: ${ohErr.message}`, undefined, courseIdStr);
  }

  const finalStatus: CourseScanStatus = {
    courseId: courseIdStr,
    courseName: course.name,
    courseColor: course.color,
    status: mergeResult.conflictsFound > 0 ? 'partial' : 'success',
    docsFound: docCount,
    itemsExtracted: mergeResult.mergedItems.length,
    lastScanned: new Date().toISOString(),
    message: `Synced ${mergeResult.mergedItems.length} items (${mergeResult.canvasItemsMatched} live Canvas, ${mergeResult.syllabusItemsRetained} syllabus)`
  };
  store.updateCourseScanStatus(finalStatus);
  store.addLog(
    'api',
    'info',
    `Rescan completed successfully for ${course.name}: ${mergeResult.mergedItems.length} total items (${mergeResult.conflictsFound} conflicts).`,
    undefined,
    courseIdStr
  );

  return { success: true, itemCount: mergeResult.mergedItems.length };
}

/**
 * 3. Scans all tracked Canvas courses sequentially
 */
export async function scanAllCourses(): Promise<{ scanned: number; totalItems: number }> {
  store.addLog('api', 'info', 'Triggered full scan across all favorited Canvas courses...');

  const courses = store.getState().courses;
  let scannedCount = 0;
  let totalItemsCount = 0;

  for (const course of courses) {
    if (!store.isCourseTracked(String(course.id))) {
      continue;
    }
    try {
      const res = await scanCourse(course);
      if (res.success) {
        scannedCount++;
        totalItemsCount += res.itemCount;
      }
    } catch (err: any) {
      store.addLog('api', 'error', `Scan failed for ${course.name}: ${err.message}`, undefined, String(course.id));
    }
  }

  store.addLog('api', 'info', `Full scan complete: ${scannedCount} courses scanned, ${totalItemsCount} total items.`);
  return { scanned: scannedCount, totalItems: totalItemsCount };
}
