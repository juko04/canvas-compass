import { store, StoreState, ViewType } from '../storage/store';
import { renderRelevanceView } from './views/relevanceView';
import { renderCourseView } from './views/courseView';
import { renderCalendarView } from './views/calendarView';
import { renderCustomView } from './views/customView';
import { renderSettingsView } from './views/settingsView';
import { DebugDrawer } from './debugDrawer';
import { getSvgIcon } from './icons';
import { scanAllCourses } from '../api/scanner';

export class CompassPanel {
  private element: HTMLElement;
  private contentArea: HTMLElement;
  private debugDrawer: DebugDrawer;
  private toastElement: HTMLElement;
  private lastRenderedView: ViewType | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'compass-panel-container';

    this.contentArea = document.createElement('div');
    this.contentArea.className = 'compass-scroll-content';

    this.debugDrawer = new DebugDrawer();

    this.toastElement = document.createElement('div');
    this.toastElement.className = 'compass-toast';

    this.render();

    // Guard outer panel container from ever scrolling away its header/navigation
    this.element.addEventListener('scroll', () => {
      if (this.element.scrollTop !== 0) {
        this.element.scrollTop = 0;
      }
    });

    store.subscribe((state) => {
      this.updateState(state);
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public showToast(message: string, durationMs: number = 3000) {
    this.toastElement.innerHTML = `<span>${getSvgIcon('warning', 13)} ${escapeHtml(message)}</span><span class="toast-close" style="font-size: 10px; cursor: pointer;">${getSvgIcon('close', 10)}</span>`;
    this.toastElement.classList.add('show');
    setTimeout(() => {
      this.toastElement.classList.remove('show');
    }, durationMs);
  }

  private render() {
    const state = store.getState();

    this.element.innerHTML = `
      <!-- Header -->
      <div class="compass-header">
        <div class="compass-title-group">
          <div class="compass-logo-glyph">${getSvgIcon('compass', 16, 2)}</div>
          <div>
            <div class="compass-title">Canvas Compass</div>
            <div class="compass-subtitle">CU Boulder • Fall 2026</div>
          </div>
        </div>
        <div class="compass-header-center-dock"></div>
        <div class="compass-header-actions">
          <button class="glass-icon-btn refresh-scan-btn" title="Refresh & scan courses">${getSvgIcon('refresh', 14)}</button>
          <button class="glass-icon-btn toggle-debug-btn" title="Toggle debug drawer">${getSvgIcon('tools', 14)}</button>
          <button class="glass-icon-btn open-settings-btn" title="Settings">${getSvgIcon('settings', 14)}</button>
          <button class="glass-icon-btn close-panel-btn" title="Close panel">${getSvgIcon('close', 14)}</button>
        </div>
      </div>

      <!-- Navigation Tabs (Only when not in settings) -->
      <div class="compass-nav">
        <div class="compass-segmented-track">
          <button class="nav-pill ${state.currentView === 'relevance' ? 'active' : ''}" data-view="relevance">Relevance</button>
          <button class="nav-pill ${state.currentView === 'by_course' ? 'active' : ''}" data-view="by_course">By Course</button>
          <button class="nav-pill ${state.currentView === 'calendar' ? 'active' : ''}" data-view="calendar">Calendar</button>
          <button class="nav-pill ${state.currentView === 'custom' ? 'active' : ''}" data-view="custom">Custom</button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="compass-filter-bar">
        <select class="glass-select filter-course" style="flex: 1.2;">
          <option value="all">All Courses (${state.courses.length})</option>
          ${state.courses.map(c => `<option value="${c.id}" ${state.filters.courseId === String(c.id) ? 'selected' : ''}>${escapeHtml(c.course_code || c.name)}</option>`).join('')}
        </select>
        <select class="glass-select filter-type" style="flex: 1;">
          <option value="all">All Types</option>
          <option value="assignment" ${state.filters.type === 'assignment' ? 'selected' : ''}>Assignments</option>
          <option value="exam" ${state.filters.type === 'exam' ? 'selected' : ''}>Exams</option>
          <option value="project" ${state.filters.type === 'project' ? 'selected' : ''}>Projects</option>
          <option value="quiz" ${state.filters.type === 'quiz' ? 'selected' : ''}>Quizzes</option>
          <option value="extra_credit" ${state.filters.type === 'extra_credit' ? 'selected' : ''}>Extra Credit</option>
        </select>
        <div class="filter-search-wrapper">
          <span class="search-icon">${getSvgIcon('search', 13)}</span>
          <input type="text" class="glass-input filter-search with-search-icon" placeholder="Search..." value="${escapeHtml(state.filters.searchQuery)}" />
        </div>
      </div>
    `;

    this.element.appendChild(this.toastElement);
    this.element.appendChild(this.contentArea);
    this.element.appendChild(this.debugDrawer.getElement());

    this.bindEvents();
    this.renderCurrentView(state);
  }

  private bindEvents() {
    this.element.querySelector('.close-panel-btn')?.addEventListener('click', () => {
      store.setPanelOpen(false);
    });

    const refreshBtn = this.element.querySelector('.refresh-scan-btn') as HTMLButtonElement;
    refreshBtn?.addEventListener('click', async () => {
      this.showToast('Scanning Canvas courses & documents...');
      refreshBtn.disabled = true;
      try {
        const res = await scanAllCourses();
        this.showToast(`Scan complete: ${res.scanned} courses, ${res.totalItems} items.`);
      } catch (err: any) {
        this.showToast(`Scan failed: ${err.message}`);
      } finally {
        refreshBtn.disabled = false;
      }
    });

    this.element.querySelector('.toggle-debug-btn')?.addEventListener('click', () => {
      store.toggleDebugDrawer();
    });

    this.element.querySelector('.open-settings-btn')?.addEventListener('click', () => {
      store.setView(store.getState().currentView === 'settings' ? 'relevance' : 'settings');
    });

    // Nav pill clicks
    const pills = this.element.querySelectorAll('.nav-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const view = (pill as HTMLElement).dataset.view as ViewType;
        store.setView(view);
      });
    });

    // Filters
    const courseSelect = this.element.querySelector('.filter-course') as HTMLSelectElement;
    const typeSelect = this.element.querySelector('.filter-type') as HTMLSelectElement;
    const searchInput = this.element.querySelector('.filter-search') as HTMLInputElement;

    courseSelect?.addEventListener('change', () => {
      store.setFilters({ courseId: courseSelect.value });
    });

    typeSelect?.addEventListener('change', () => {
      store.setFilters({ type: typeSelect.value });
    });

    searchInput?.addEventListener('input', () => {
      store.setFilters({ searchQuery: searchInput.value.trim() });
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Cmd+Shift+C or Ctrl+Shift+C toggles Compass panel
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        store.togglePanel();
        return;
      }

      // Cmd+F or Ctrl+F while panel is open: focus search bar
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        if (store.getState().panelOpen) {
          e.preventDefault();
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      }

      // Escape key clears search query or closes panel
      if (e.key === 'Escape') {
        if (searchInput && (document.activeElement === searchInput || searchInput.value)) {
          searchInput.value = '';
          store.setFilters({ searchQuery: '' });
          searchInput.blur();
        } else if (store.getState().panelOpen) {
          store.setPanelOpen(false);
        }
      }
    });
  }

  public showLiquidBanner(title: string, message: string, urgency: 'normal' | 'urgent' = 'normal') {
    const root = this.element.getRootNode() as ShadowRoot | Document;
    let banner = root.querySelector('.liquid-floating-banner') as HTMLElement;
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'liquid-floating-banner';
      if (root instanceof ShadowRoot) {
        root.appendChild(banner);
      } else {
        document.body.appendChild(banner);
      }
    }

    const urgencyColor = urgency === 'urgent' ? '#EF4444' : '#CFB87C';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${urgencyColor};">${urgency === 'urgent' ? getSvgIcon('alert-triangle', 16) : getSvgIcon('compass', 16)}</span>
        <div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 12px;">${escapeHtml(title)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(message)}</div>
        </div>
      </div>
      <button class="glass-icon-btn close-toast-banner-btn" style="width: 20px; height: 20px; padding: 0;">
        ${getSvgIcon('close', 11)}
      </button>
    `;

    banner.querySelector('.close-toast-banner-btn')?.addEventListener('click', () => {
      banner.classList.remove('visible');
    });

    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });

    setTimeout(() => {
      banner.classList.remove('visible');
    }, 4500);
  }

  private updateState(state: StoreState) {
    if (state.panelOpen) {
      this.element.classList.add('open');
    } else {
      this.element.classList.remove('open');
    }

    // Toggle navigation & filter bar visibility when in settings view
    const navBar = this.element.querySelector('.compass-nav') as HTMLElement;
    const filterBar = this.element.querySelector('.compass-filter-bar') as HTMLElement;

    if (state.currentView === 'settings') {
      if (navBar) navBar.style.display = 'none';
      if (filterBar) filterBar.style.display = 'none';
    } else {
      if (navBar) navBar.style.display = 'flex';
      if (filterBar) filterBar.style.display = 'flex';

      // Update active nav pill
      this.element.querySelectorAll('.nav-pill').forEach(pill => {
        const pView = (pill as HTMLElement).dataset.view;
        if (pView === state.currentView) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    this.renderCurrentView(state);
  }

  private renderCurrentView(state: StoreState) {
    const isSameView = this.lastRenderedView === state.currentView;
    const previousScrollTop = isSameView ? this.contentArea.scrollTop : 0;
    this.lastRenderedView = state.currentView;

    this.element.scrollTop = 0;
    this.contentArea.innerHTML = '';

    switch (state.currentView) {
      case 'relevance':
        this.contentArea.appendChild(renderRelevanceView(state));
        break;
      case 'by_course':
        this.contentArea.appendChild(renderCourseView(state));
        break;
      case 'calendar':
        this.contentArea.appendChild(renderCalendarView(state));
        break;
      case 'custom':
        this.contentArea.appendChild(renderCustomView(state));
        break;
      case 'settings':
        this.contentArea.appendChild(renderSettingsView(state));
        break;
    }

    if (isSameView && previousScrollTop > 0) {
      this.contentArea.scrollTop = previousScrollTop;
      requestAnimationFrame(() => {
        if (this.contentArea) {
          this.contentArea.scrollTop = previousScrollTop;
        }
      });
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
