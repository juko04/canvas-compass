import { StoreState, store } from '../../storage/store';
import { rankItems } from '../../rank/ranker';
import { renderItemCard } from '../components/itemCard';
import { generateIcsForItems } from '../../export/ics';
import { getSvgIcon } from '../icons';
import { GradedItem, ItemType, CourseOfficeHours } from '../../types/items';
import { scanCourse, syncCoursesFromCanvas } from '../../api/scanner';
import { parsePdfDocument } from '../../parsers/pdfParser';
import { extractOfficeHoursFromText } from '../../parsers/officeHoursParser';
import { GeminiProvider } from '../../ai/gemini';
import { CU_BOULDER_FALL_2026 } from '../../api/academicCalendar';

// Track expanded courses in memory so expansion state persists across toggles
const expandedCourseIds = new Set<string>();

export function renderCourseView(state: StoreState): HTMLElement {
  const container = document.createElement('div');
  container.className = 'course-view';

  if (state.courses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-secondary);">
        <div style="margin-bottom: 8px; color: var(--accent-gold);">${getSvgIcon('course', 32)}</div>
        <div style="font-weight: 600; color: var(--text-primary);">No favorited courses found.</div>
        <div style="font-size: 11.5px; margin-top: 4px; color: var(--text-muted);">Favorite your current classes in Canvas to see them here.</div>
      </div>
    `;
    return container;
  }

  // Top header with summary and utility actions
  const hasDemoItems = state.items.some(i => i.id.startsWith('mock-'));
  const topBar = document.createElement('div');
  topBar.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px; gap: 8px; flex-wrap: wrap;';
  topBar.innerHTML = `
    <div style="font-size: 11px; color: var(--text-secondary);">
      <strong style="color: var(--text-primary);">${state.courses.length} courses</strong> • Click any course to show/hide assignments
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <button class="glass-btn sync-canvas-courses-btn" style="font-size: 10px; padding: 3px 8px; color: var(--accent-gold);" title="Fetch favorited courses and items from Canvas REST API">
        ${getSvgIcon('refresh', 10)}
        <span>Sync from Canvas</span>
      </button>
      ${hasDemoItems ? `
        <button class="glass-btn clear-demo-data-btn" style="font-size: 10px; padding: 3px 8px; color: var(--text-secondary);" title="Clear synthetic sample assignments">
          ${getSvgIcon('trash', 10)}
          <span>Clear Demo</span>
        </button>
      ` : `
        <button class="glass-btn restore-demo-data-btn" style="font-size: 10px; padding: 3px 8px; color: var(--text-secondary);" title="Restore sample syllabi items for offline testing">
          ${getSvgIcon('plus', 10)}
          <span>Load Demo Data</span>
        </button>
      `}
    </div>
  `;

  topBar.querySelector('.sync-canvas-courses-btn')?.addEventListener('click', async () => {
    const btn = topBar.querySelector('.sync-canvas-courses-btn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${getSvgIcon('refresh', 10)} <span>Syncing...</span>`;
    }
    try {
      await syncCoursesFromCanvas(true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('refresh', 10)} <span>Sync from Canvas</span>`;
      }
    }
  });

  topBar.querySelector('.clear-demo-data-btn')?.addEventListener('click', () => {
    if (confirm('Clear demo/sample assignments? Real Canvas and imported items will be preserved.')) {
      store.clearMockItems();
      store.addLog('ui', 'info', 'Cleared demo mock assignments.');
    }
  });

  topBar.querySelector('.restore-demo-data-btn')?.addEventListener('click', () => {
    store.restoreMockItems();
    store.addLog('ui', 'info', 'Restored demo mock assignments for testing.');
  });
  container.appendChild(topBar);

  let filteredItems = state.items;
  if (state.filters.type !== 'all') {
    filteredItems = filteredItems.filter(i => i.type === state.filters.type);
  }
  if (state.filters.searchQuery) {
    const q = state.filters.searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.courseName.toLowerCase().includes(q) ||
      (i.notes && i.notes.toLowerCase().includes(q))
    );
  }

  const rankedAll = rankItems(filteredItems, state.settings.rankingWeights);

  for (const course of state.courses) {
    const courseIdStr = String(course.id);
    const isTracked = store.isCourseTracked(courseIdStr);
    const courseItems = rankedAll.filter(i => i.courseId === courseIdStr);
    const dueItems = courseItems.filter(i => !i.completed);
    const completedItems = courseItems.filter(i => i.completed);
    const isExpanded = expandedCourseIds.has(courseIdStr);

    const scanStatus = state.scanStatuses[courseIdStr] || {
      courseId: courseIdStr,
      courseName: course.name,
      status: 'idle',
      docsFound: 0,
      itemsExtracted: 0
    };

    const courseCard = document.createElement('div');
    courseCard.className = 'glass-card';
    courseCard.style.cssText = `
      margin-bottom: 12px;
      cursor: default;
      transition: border-color 0.2s ease;
      padding: 12px 14px;
    `;
    if (!isTracked) {
      courseCard.classList.add('course-muted');
    }

    // Status badge styling
    let statusBadgeClass = 'badge-status-ready';
    let statusText = 'Ready';
    if (scanStatus.status === 'scanning') { statusBadgeClass = 'badge-status-scanning'; statusText = 'Scanning...'; }
    if (scanStatus.status === 'success') { statusBadgeClass = 'badge-status-synced'; statusText = 'Synced'; }
    if (scanStatus.status === 'partial') { statusBadgeClass = 'badge-status-scanning'; statusText = 'Review Needed'; }
    const officeHours = state.officeHours?.[courseIdStr] || {};
    const hasOfficeHours = !!(officeHours.instructorName || officeHours.email || officeHours.officeHours || officeHours.zoomUrl || officeHours.location);

    courseCard.innerHTML = `
      <!-- Clickable Accordion Header -->
      <div class="course-accordion-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px;">
          <span class="course-chevron ${isExpanded ? 'expanded' : ''}" style="flex-shrink: 0;" title="Click to expand/collapse course assignments">
            ${getSvgIcon('chevron-down', 13)}
          </span>
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${course.color || '#CFB87C'}; flex-shrink: 0; box-shadow: 0 0 8px ${course.color || '#CFB87C'}66;"></span>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">
              ${escapeHtml(course.name)}
            </div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
              ${course.term?.name || 'Fall 2026'} • 
              <strong style="color: ${dueItems.length > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)'}; font-weight: 700;">${dueItems.length} due</strong>
              ${completedItems.length > 0 ? ` • <span class="text-completed-count">${completedItems.length} done</span>` : ''}
              ${!isTracked ? '• <span class="text-muted-tag">Muted</span>' : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button class="glass-btn toggle-track-btn ${isTracked ? 'course-btn-tracked' : 'course-btn-muted'}" style="padding: 3px 9px; font-size: 11px;" title="${isTracked ? 'Click to mute course (e.g. if you are a TA)' : 'Click to resume tracking course'}">
            ${isTracked ? getSvgIcon('eye', 12) : getSvgIcon('eye-off', 12)}
            <span>${isTracked ? 'Tracked' : 'Muted'}</span>
          </button>
          <span class="badge-pill ${statusBadgeClass}">
            ● ${statusText}
          </span>
        </div>
      </div>

      <!-- Collapsible Body -->
      <div class="course-accordion-body" style="display: ${isExpanded ? 'block' : 'none'}; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
          <button class="glass-btn rescan-course-btn" style="flex: 1; font-size: 11px; padding: 4px 8px;" ${!isTracked || scanStatus.status === 'scanning' ? 'disabled style="opacity: 0.6;"' : ''}>
            ${getSvgIcon('refresh', 12)}
            <span>${scanStatus.status === 'scanning' ? 'Scanning...' : 'Rescan'}</span>
          </button>
          <button class="glass-btn toggle-import-btn" style="flex: 1.4; font-size: 11px; padding: 4px 8px; border-color: rgba(207, 184, 124, 0.4); color: var(--accent-gold);">
            ${getSvgIcon('sparkles', 12)}
            <span>Import Gemini JSON</span>
          </button>
          <button class="glass-btn export-course-ics-btn primary" style="flex: 1; font-size: 11px; padding: 4px 8px;">
            ${getSvgIcon('calendar', 12)}
            <span>Export ICS</span>
          </button>
        </div>

        <!-- Gemini Web Syllabus Import Drawer (Collapsible) -->
        <div class="gemini-import-drawer" style="display: none; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--accent-gold); display: flex; align-items: center; gap: 5px;">
              ${getSvgIcon('sparkles', 13)}
              <span>Syllabus Ingestion & AI Tools</span>
            </div>
            <button class="glass-btn copy-prompt-btn primary" style="padding: 2px 8px; font-size: 10.5px;">
              ${getSvgIcon('copy', 11)}
              <span>Copy Gemini Prompt</span>
            </button>
          </div>

          <!-- Direct In-Extension PDF Drag & Drop -->
          <div class="pdf-dropzone course-pdf-dropzone">
            <div style="color: var(--accent-gold); margin-bottom: 4px;">${getSvgIcon('upload', 18)}</div>
            <div style="font-size: 11.5px; font-weight: 600; color: var(--text-primary);">
              Drop Syllabus PDF here or click to browse
            </div>
            <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
              Auto-extracts dates & tables with PDF.js and Gemini Flash
            </div>
            <input type="file" class="direct-pdf-input" accept=".pdf" style="display: none;" />
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0;">
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
            <span style="font-size: 10px; color: var(--text-muted); font-weight: 600;">OR PASTE EXTERNAL JSON</span>
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
          </div>

          <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4;">
            If using Gemini Web or Claude: copy prompt above, upload PDF at <strong>gemini.google.com</strong>, then paste output JSON here.
          </p>
          <textarea class="glass-input gemini-json-input" placeholder='Paste Gemini output JSON here: [ { "title": "Homework 1", "type": "assignment", "dueDate": "2026-09-15" ... } ]' rows="3" style="width: 100%; font-family: monospace; font-size: 11px; margin-bottom: 8px;"></textarea>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="glass-btn" style="padding: 3px 8px; font-size: 10.5px; cursor: pointer;">
              ${getSvgIcon('upload', 11)}
              <span>Upload .json File</span>
              <input type="file" class="gemini-json-file" accept=".json" style="display: none;" />
            </label>
            <button class="glass-btn primary submit-import-btn" style="padding: 3px 12px; font-size: 11px;">
              Import to Course
            </button>
          </div>
        </div>

        <!-- Instructor & Office Hours Card (Uncluttered, expanded only) -->
        <div class="office-hours-card" style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--accent-gold); display: flex; align-items: center; gap: 5px;">
              ${getSvgIcon('user', 12)}
              <span>Instructor & Office Hours</span>
            </div>
            <button class="glass-btn edit-office-hours-btn" type="button" style="padding: 2px 7px; font-size: 10px;">
              ${hasOfficeHours ? 'Edit' : '+ Add Details'}
            </button>
          </div>
          ${hasOfficeHours ? `
            <div class="office-hours-details" style="margin-top: 6px;">
              ${officeHours.instructorName ? `<div class="office-hours-row">${getSvgIcon('user', 11)} <strong>${escapeHtml(officeHours.instructorName)}</strong></div>` : ''}
              ${officeHours.email ? `<div class="office-hours-row">${getSvgIcon('mail', 11)} <a href="mailto:${escapeHtml(officeHours.email)}">${escapeHtml(officeHours.email)}</a></div>` : ''}
              ${officeHours.zoomUrl ? `<div class="office-hours-row">${getSvgIcon('video', 11)} <a href="${escapeHtml(officeHours.zoomUrl)}" target="_blank" rel="noopener noreferrer">${officeHours.zoomUrl.includes('calendly') ? 'Book Office Hours (Calendly)' : officeHours.zoomUrl.includes('calendar') ? 'Book Office Hours' : 'Join Zoom Office Hours'} ${getSvgIcon('external-link', 10)}</a></div>` : ''}
              ${officeHours.officeHours ? `<div class="office-hours-row">${getSvgIcon('clock', 11)} <span>${escapeHtml(officeHours.officeHours)}</span></div>` : ''}
              ${officeHours.location ? `<div class="office-hours-row">${getSvgIcon('course', 11)} <span>${escapeHtml(officeHours.location)}</span></div>` : ''}
            </div>
          ` : `
            <div class="office-hours-empty" style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 4px;">
              No office hours listed yet. Click "+ Add Details" to save Zoom links and email.
            </div>
          `}
          <!-- Inline Edit Drawer for Office Hours -->
          <div class="office-hours-edit-drawer" style="display: none; margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.20); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 10.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Edit Instructor & Contact Details</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
              <input type="text" class="glass-input edit-oh-name" placeholder="Professor / TA Name" value="${escapeHtml(officeHours.instructorName || '')}" style="font-size: 11px; padding: 5px 8px;" />
              <input type="email" class="glass-input edit-oh-email" placeholder="Email (name@colorado.edu)" value="${escapeHtml(officeHours.email || '')}" style="font-size: 11px; padding: 5px 8px;" />
              <input type="text" class="glass-input edit-oh-times" placeholder="Times (e.g. Tue/Thu 2-3pm)" value="${escapeHtml(officeHours.officeHours || '')}" style="font-size: 11px; padding: 5px 8px;" />
              <input type="text" class="glass-input edit-oh-location" placeholder="Room (e.g. ECCR 244)" value="${escapeHtml(officeHours.location || '')}" style="font-size: 11px; padding: 5px 8px;" />
            </div>
            <input type="url" class="glass-input edit-oh-zoom" placeholder="Zoom / Calendly Link (https://...)" value="${escapeHtml(officeHours.zoomUrl || '')}" style="width: 100%; font-size: 11px; padding: 5px 8px; margin-bottom: 8px;" />
            <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px;">
              <button class="glass-btn cancel-oh-btn" type="button" style="padding: 4px 10px; font-size: 11px;">Cancel</button>
              <button class="glass-btn primary save-oh-btn" type="button" style="padding: 4px 14px; font-size: 11px;">Save</button>
            </div>
          </div>
        </div>

        <!-- Course Items List -->
        <div class="course-items-container" style="margin-top: 14px;">
          ${!isTracked ? `
            <div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 6px 0;">Course is muted. Assignments are excluded from your deadlines and badge counts.</div>
          ` : courseItems.length === 0 ? `
            <div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 6px 0;">No items found. Click "Rescan" or "Import Gemini JSON" to populate.</div>
          ` : `
            <!-- Due / Active Section -->
            <div class="course-due-group">
              ${dueItems.length === 0 ? `
                <div style="font-size: 11.5px; color: #10B981; font-weight: 600; padding: 6px 0; display: flex; align-items: center; gap: 5px;">
                  ${getSvgIcon('check-circle', 12)}
                  <span>All assignments completed for this course!</span>
                </div>
              ` : `
                <div class="due-cards-list"></div>
              `}
            </div>

            <!-- Completed Section -->
            ${completedItems.length > 0 ? `
              <div class="course-completed-group" style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed rgba(255, 255, 255, 0.12);">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="display: flex; align-items: center; gap: 5px;">
                    ${getSvgIcon('check-circle', 12)}
                    <span>Completed (${completedItems.length})</span>
                  </span>
                  <span style="font-size: 10px; font-weight: 400; color: var(--text-muted);">Click checkbox to uncheck & restore to due</span>
                </div>
                <div class="completed-cards-list"></div>
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;

    // Click accordion header to toggle expand/collapse
    courseCard.querySelector('.course-accordion-header')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.toggle-track-btn')) return;

      if (expandedCourseIds.has(courseIdStr)) {
        expandedCourseIds.delete(courseIdStr);
      } else {
        expandedCourseIds.add(courseIdStr);
      }

      const body = courseCard.querySelector('.course-accordion-body') as HTMLElement;
      const chevron = courseCard.querySelector('.course-chevron') as HTMLElement;
      const isOpen = expandedCourseIds.has(courseIdStr);

      if (body) {
        body.style.display = isOpen ? 'block' : 'none';
      }
      if (chevron) {
        chevron.classList.toggle('expanded', isOpen);
      }
    });

    // Toggle track button event
    courseCard.querySelector('.toggle-track-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.toggleCourseTracking(courseIdStr);
    });

    // Office hours edit listeners
    const ohEditBtn = courseCard.querySelector('.edit-office-hours-btn') as HTMLButtonElement;
    const ohDrawer = courseCard.querySelector('.office-hours-edit-drawer') as HTMLElement;
    ohEditBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isClosed = ohDrawer.style.display === 'none';
      ohDrawer.style.display = isClosed ? 'block' : 'none';
      ohEditBtn.textContent = isClosed ? 'Close' : (hasOfficeHours ? 'Edit' : '+ Add Details');
    });

    const cancelOhBtn = courseCard.querySelector('.cancel-oh-btn') as HTMLButtonElement;
    cancelOhBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ohDrawer.style.display = 'none';
      if (ohEditBtn) ohEditBtn.textContent = hasOfficeHours ? 'Edit' : '+ Add Details';
      const curOh = store.getState().officeHours?.[courseIdStr] || {};
      const nameInput = courseCard.querySelector('.edit-oh-name') as HTMLInputElement;
      const emailInput = courseCard.querySelector('.edit-oh-email') as HTMLInputElement;
      const timesInput = courseCard.querySelector('.edit-oh-times') as HTMLInputElement;
      const locInput = courseCard.querySelector('.edit-oh-location') as HTMLInputElement;
      const zoomInput = courseCard.querySelector('.edit-oh-zoom') as HTMLInputElement;
      if (nameInput) nameInput.value = curOh.instructorName || '';
      if (emailInput) emailInput.value = curOh.email || '';
      if (timesInput) timesInput.value = curOh.officeHours || '';
      if (locInput) locInput.value = curOh.location || '';
      if (zoomInput) zoomInput.value = curOh.zoomUrl || '';
    });

    const saveOhBtn = courseCard.querySelector('.save-oh-btn') as HTMLButtonElement;
    saveOhBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nameInp = courseCard.querySelector('.edit-oh-name') as HTMLInputElement;
      const emailInp = courseCard.querySelector('.edit-oh-email') as HTMLInputElement;
      const timesInp = courseCard.querySelector('.edit-oh-times') as HTMLInputElement;
      const locInp = courseCard.querySelector('.edit-oh-location') as HTMLInputElement;
      const zoomInp = courseCard.querySelector('.edit-oh-zoom') as HTMLInputElement;

      const newOh: CourseOfficeHours = {
        instructorName: nameInp?.value.trim() || undefined,
        email: emailInp?.value.trim() || undefined,
        officeHours: timesInp?.value.trim() || undefined,
        location: locInp?.value.trim() || undefined,
        zoomUrl: zoomInp?.value.trim() || undefined,
      };

      ohDrawer.style.display = 'none';
      store.setOfficeHours(courseIdStr, newOh);
      store.addLog('ui', 'info', `Updated office hours details for ${course.name}`, undefined, courseIdStr);
    });

    // Toggle Gemini / Syllabus import drawer event
    const importDrawer = courseCard.querySelector('.gemini-import-drawer') as HTMLElement;
    courseCard.querySelector('.toggle-import-btn')?.addEventListener('click', () => {
      const isVisible = importDrawer.style.display !== 'none';
      importDrawer.style.display = isVisible ? 'none' : 'block';
    });

    // In-extension PDF Drag & Drop listeners
    const dropzone = courseCard.querySelector('.course-pdf-dropzone') as HTMLElement;
    const directPdfInput = courseCard.querySelector('.direct-pdf-input') as HTMLInputElement;

    dropzone?.addEventListener('click', () => {
      directPdfInput?.click();
    });

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });

    const processDroppedPdf = async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please provide a valid .pdf syllabus file.');
        return;
      }

      dropzone.innerHTML = `
        <div style="color: #F59E0B; margin-bottom: 4px;">${getSvgIcon('refresh', 20)}</div>
        <div style="font-size: 11.5px; font-weight: 600; color: var(--text-primary);">Extracting assignments from ${escapeHtml(file.name)}...</div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Parsing layout and schedule tables...</div>
      `;

      try {
        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        const termRange = {
          startDate: course.term?.start_at ? course.term.start_at.split('T')[0] : CU_BOULDER_FALL_2026.startDate,
          endDate: course.term?.end_at ? course.term.end_at.split('T')[0] : CU_BOULDER_FALL_2026.endDate
        };

        const parsed = await parsePdfDocument(bytes, file.name, courseIdStr, course.name, course.color || '#CFB87C', termRange);
        let finalItems = parsed.items;

        const apiKey = store.getState().settings.geminiApiKey;
        if (apiKey && parsed.rawText.length > 80) {
          try {
            const provider = new GeminiProvider(apiKey, store.getState().settings.geminiModel);
            const aiRes = await provider.extractDeadlines(parsed.rawText, file.name, courseIdStr, course.name, termRange);
            if (aiRes.items && aiRes.items.length > 0) {
              finalItems = aiRes.items;
              store.addLog('ai', 'info', `Gemini extracted ${aiRes.items.length} items from ${file.name}`);
            }
          } catch (aiErr: any) {
            store.addLog('ai', 'warn', `Gemini extraction fallback to Tier 1: ${aiErr.message}`);
          }
        }

        // Also extract instructor details and office hours from dropped syllabus
        const detectedOH = extractOfficeHoursFromText(parsed.rawText, course.name);
        if (Object.values(detectedOH).some(Boolean)) {
          const existingOH = store.getState().officeHours?.[courseIdStr] || {};
          store.setOfficeHours(courseIdStr, {
            instructorName: detectedOH.instructorName || existingOH.instructorName,
            email: detectedOH.email || existingOH.email,
            officeHours: detectedOH.officeHours || existingOH.officeHours,
            zoomUrl: detectedOH.zoomUrl || existingOH.zoomUrl,
            location: detectedOH.location || existingOH.location
          });
          store.addLog('parser', 'info', `Extracted instructor & office hours from ${file.name}`, undefined, courseIdStr);
        }

        if (finalItems.length > 0) {
          store.replaceCourseItems(courseIdStr, finalItems);
          store.addLog('parser', 'info', `Extracted ${finalItems.length} items from ${file.name} for ${course.name}`, undefined, courseIdStr);
          alert(`Successfully extracted ${finalItems.length} items from ${file.name}!`);
        } else {
          alert(`No dated items found in ${file.name}. Try copying the Gemini prompt.`);
        }
      } catch (err: any) {
        alert(`Failed to parse PDF: ${err.message}`);
      } finally {
        dropzone.innerHTML = `
          <div style="color: var(--accent-gold); margin-bottom: 4px;">${getSvgIcon('upload', 18)}</div>
          <div style="font-size: 11.5px; font-weight: 600; color: var(--text-primary);">Drop Syllabus PDF here or click to browse</div>
          <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">Auto-extracts dates & tables with PDF.js and Gemini Flash</div>
          <input type="file" class="direct-pdf-input" accept=".pdf" style="display: none;" />
        `;
      }
    };

    dropzone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        await processDroppedPdf(file);
      }
    });

    directPdfInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processDroppedPdf(file);
      }
    });

    // Copy Gemini Prompt event
    const courseCode = course.course_code || course.name.split(':')[0] || 'Course';
    const geminiPrompt = `You are a precision syllabus extractor for the student extension Canvas Compass. I have attached the syllabus for ${escapeHtml(course.name)} (${courseCode}).

Extract EVERY graded assignment, exam, quiz, project, presentation, lab, reading milestone, and key date from this document into a single valid JSON array matching this exact schema:

[
  {
    "title": "Clear Assignment / Exam Title",
    "type": "assignment" | "exam" | "quiz" | "project" | "presentation" | "lab" | "reading" | "extra_credit",
    "dueDate": "YYYY-MM-DD",
    "dueTime": "HH:MM" (or "23:59" if not stated),
    "points": 50 (or null if not stated),
    "notes": "Brief notes on scope, chapter, or submission location"
  }
]

Extraction Rules:
1. Anchor yearless dates like "Sep 15" or "Week 4" to Fall 2026.
2. If recurring (e.g. weekly homework), expand each week to its individual dated entry.
3. Output ONLY the raw JSON array (wrapped in \`\`\`json ... \`\`\` or raw text). No chit-chat.`;

    courseCard.querySelector('.copy-prompt-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(geminiPrompt);
      alert(`Copied Gemini prompt for ${courseCode} to clipboard!\n\nNow open gemini.google.com, attach your syllabus PDF/file, and paste.`);
    });

    // File upload event
    const fileInput = courseCard.querySelector('.gemini-json-file') as HTMLInputElement;
    const jsonTextarea = courseCard.querySelector('.gemini-json-input') as HTMLTextAreaElement;

    fileInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      jsonTextarea.value = text;
    });

    // Submit Gemini JSON import
    courseCard.querySelector('.submit-import-btn')?.addEventListener('click', () => {
      const raw = jsonTextarea.value.trim();
      if (!raw) {
        alert('Please paste Gemini JSON or upload a file first.');
        return;
      }

      try {
        let jsonStr = raw;
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }

        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) {
          throw new Error('Root JSON must be an array of items.');
        }

        const newItems: GradedItem[] = parsed.map((item: any, idx: number) => ({
          id: `gemini-web-${courseIdStr}-${Date.now()}-${idx}`,
          courseId: courseIdStr,
          courseName: course.name,
          courseColor: course.color || '#CFB87C',
          title: String(item.title || 'Untitled Assignment'),
          type: (item.type as ItemType) || 'assignment',
          dueDate: item.dueDate || null,
          dueTime: item.dueTime || '23:59',
          points: typeof item.points === 'number' ? item.points : null,
          weight: null,
          isTBD: !item.dueDate,
          isUndated: !item.dueDate,
          isInferred: false,
          source: 'custom',
          sourceDoc: 'Gemini Web Syllabus Import',
          notes: item.notes || undefined,
          completed: false,
          userEdited: true
        }));

        store.addItemsBatch(newItems);
        store.addLog('ai', 'info', `Imported ${newItems.length} items from Gemini Web for ${course.name}`, undefined, courseIdStr);
        alert(`Successfully imported ${newItems.length} items for ${course.name}!`);
        jsonTextarea.value = '';
        importDrawer.style.display = 'none';
      } catch (err: any) {
        alert('Could not parse JSON. Please ensure Gemini output valid JSON.\nError: ' + err.message);
      }
    });

    // Rescan button event
    const rescanBtn = courseCard.querySelector('.rescan-course-btn') as HTMLButtonElement;
    rescanBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isTracked || scanStatus.status === 'scanning') return;
      rescanBtn.disabled = true;
      rescanBtn.innerHTML = `${getSvgIcon('refresh', 12)} <span style="display: inline-block;">Scanning...</span>`;
      try {
        await scanCourse(course);
      } catch (err: any) {
        store.addLog('api', 'error', `Rescan failed for ${course.name}: ${err.message}`, undefined, courseIdStr);
      } finally {
        if (rescanBtn) {
          rescanBtn.disabled = false;
          rescanBtn.innerHTML = `${getSvgIcon('refresh', 12)} <span>Rescan</span>`;
        }
      }
    });

    // Export course ICS event
    courseCard.querySelector('.export-course-ics-btn')?.addEventListener('click', () => {
      const icsData = generateIcsForItems(courseItems, course.name);
      downloadFile(icsData, `${course.course_code || 'course'}-schedule.ics`, 'text/calendar');
      store.addLog('ui', 'info', `Exported .ics calendar for ${course.name} (${courseItems.length} events)`);
    });

    // Populate active and completed items into their respective lists
    const dueList = courseCard.querySelector('.due-cards-list');
    if (dueList) {
      for (const item of dueItems) {
        dueList.appendChild(renderItemCard(item, state.selectedItemId === item.id));
      }
    }

    const completedList = courseCard.querySelector('.completed-cards-list');
    if (completedList) {
      for (const item of completedItems) {
        completedList.appendChild(renderItemCard(item, state.selectedItemId === item.id));
      }
    }

    container.appendChild(courseCard);
  }

  return container;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
