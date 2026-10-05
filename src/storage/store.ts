import { GradedItem, CourseOfficeHours } from '../types/items';
import { CompassSettings, DEFAULT_SETTINGS } from '../types/settings';
import { CanvasCourse, CourseScanStatus } from '../types/canvas';
import { DebugLogEntry } from '../types/debug';
import { MOCK_COURSES, MOCK_ITEMS, MOCK_SCAN_STATUSES } from '../mock/mockData';

export type ViewType = 'relevance' | 'by_course' | 'calendar' | 'custom' | 'settings';

export interface FilterState {
  courseId: string | 'all';
  type: string | 'all';
  searchQuery: string;
  hideCompleted: boolean;
}

export interface StoreState {
  items: GradedItem[];
  courses: CanvasCourse[];
  scanStatuses: Record<string, CourseScanStatus>;
  settings: CompassSettings;
  logs: DebugLogEntry[];
  currentView: ViewType;
  filters: FilterState;
  panelOpen: boolean;
  debugDrawerOpen: boolean;
  selectedItemId: string | null;
  officeHours: Record<string, CourseOfficeHours>;
}

type Listener = (state: StoreState) => void;

class StateStore {
  private state: StoreState = {
    items: [...MOCK_ITEMS],
    courses: [...MOCK_COURSES],
    scanStatuses: Object.fromEntries(MOCK_SCAN_STATUSES.map(s => [s.courseId, s])),
    settings: { ...DEFAULT_SETTINGS },
    logs: [],
    currentView: 'relevance',
    filters: {
      courseId: 'all',
      type: 'all',
      searchQuery: '',
      hideCompleted: false
    },
    panelOpen: false,
    debugDrawerOpen: false,
    selectedItemId: null,
    officeHours: {}
  };

  private listeners: Set<Listener> = new Set();
  public isLoadedFromStorage = false;

  constructor() {
    this.loadFromStorage();

    // Listen for cross-device sync changes
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
          if (changes.canvas_compass_sync_settings?.newValue) {
            this.state.settings = { ...this.state.settings, ...changes.canvas_compass_sync_settings.newValue };
          }
          if (changes.canvas_compass_sync_office_hours?.newValue) {
            this.state.officeHours = { ...this.state.officeHours, ...changes.canvas_compass_sync_office_hours.newValue };
          }
          this.notify();
        }
      });
    }
  }

  public getState(): StoreState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[CanvasCompass Store] Listener error:', err);
      }
    }
  }

  private async saveToStorage() {
    // 1. Full cache to chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({
          'canvas_compass_items': this.state.items,
          'canvas_compass_courses': this.state.courses,
          'canvas_compass_scan_statuses': this.state.scanStatuses,
          'canvas_compass_settings': this.state.settings,
          'canvas_compass_office_hours': this.state.officeHours
        });
      } catch (e) {
        console.warn('[CanvasCompass Store] Could not save to chrome.storage.local:', e);
      }
    }

    // 2. Partitioned lightweight sync to chrome.storage.sync (<100KB quota)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      try {
        const customItems = this.state.items.filter(i => i.source === 'custom');
        const completionOverrides: Record<string, boolean> = {};
        for (const item of this.state.items) {
          if (item.userEdited) {
            completionOverrides[item.id] = item.completed;
          }
        }

        await chrome.storage.sync.set({
          'canvas_compass_sync_settings': this.state.settings,
          'canvas_compass_sync_custom_items': customItems,
          'canvas_compass_sync_office_hours': this.state.officeHours,
          'canvas_compass_sync_completion_overrides': completionOverrides
        });
      } catch (e) {
        console.warn('[CanvasCompass Store] Could not save to chrome.storage.sync:', e);
      }
    }
  }

  private async loadFromStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        // Load local cache
        if (chrome.storage.local) {
          const res = await chrome.storage.local.get([
            'canvas_compass_items',
            'canvas_compass_courses',
            'canvas_compass_scan_statuses',
            'canvas_compass_settings',
            'canvas_compass_office_hours'
          ]);

          if (res.canvas_compass_items && Array.isArray(res.canvas_compass_items)) {
            this.state.items = res.canvas_compass_items;
          }
          if (res.canvas_compass_courses && Array.isArray(res.canvas_compass_courses)) {
            this.state.courses = res.canvas_compass_courses;
          }
          if (res.canvas_compass_scan_statuses) {
            this.state.scanStatuses = res.canvas_compass_scan_statuses;
          }
          if (res.canvas_compass_settings) {
            this.state.settings = { ...DEFAULT_SETTINGS, ...res.canvas_compass_settings };
          }
          if (res.canvas_compass_office_hours) {
            this.state.officeHours = res.canvas_compass_office_hours;
          }
        }

        // Overlay chrome.storage.sync values
        if (chrome.storage.sync) {
          const syncRes = await chrome.storage.sync.get([
            'canvas_compass_sync_settings',
            'canvas_compass_sync_custom_items',
            'canvas_compass_sync_office_hours',
            'canvas_compass_sync_completion_overrides'
          ]);

          if (syncRes.canvas_compass_sync_settings) {
            this.state.settings = { ...this.state.settings, ...syncRes.canvas_compass_sync_settings };
          }
          if (syncRes.canvas_compass_sync_office_hours) {
            this.state.officeHours = { ...this.state.officeHours, ...syncRes.canvas_compass_sync_office_hours };
          }
          if (Array.isArray(syncRes.canvas_compass_sync_custom_items) && syncRes.canvas_compass_sync_custom_items.length > 0) {
            const syncedCustom = syncRes.canvas_compass_sync_custom_items;
            const existingNonCustom = this.state.items.filter(i => i.source !== 'custom');
            this.state.items = [...syncedCustom, ...existingNonCustom];
          }
          if (syncRes.canvas_compass_sync_completion_overrides) {
            const overrides = syncRes.canvas_compass_sync_completion_overrides;
            this.state.items = this.state.items.map(item => {
              if (item.id in overrides) {
                return { ...item, completed: overrides[item.id], userEdited: true };
              }
              return item;
            });
          }
        }

        this.isLoadedFromStorage = true;
        this.notify();
      } catch (e) {
        console.warn('[CanvasCompass Store] Storage load fallback to default mock state:', e);
      }
    }
  }

  // State actions
  public setPanelOpen(open: boolean) {
    this.state = { ...this.state, panelOpen: open };
    this.notify();
  }

  public togglePanel() {
    this.setPanelOpen(!this.state.panelOpen);
  }

  public setDebugDrawerOpen(open: boolean) {
    this.state = { ...this.state, debugDrawerOpen: open };
    this.notify();
  }

  public toggleDebugDrawer() {
    this.setDebugDrawerOpen(!this.state.debugDrawerOpen);
  }

  public setView(view: ViewType) {
    this.state = { ...this.state, currentView: view };
    this.notify();
  }

  public setFilters(filters: Partial<FilterState>) {
    this.state = {
      ...this.state,
      filters: { ...this.state.filters, ...filters }
    };
    this.notify();
  }

  public setSelectedItem(id: string | null) {
    this.state = { ...this.state, selectedItemId: id };
    this.notify();
  }

  public updateItem(updated: GradedItem) {
    const existingIndex = this.state.items.findIndex(i => i.id === updated.id);
    let newItems: GradedItem[];
    if (existingIndex >= 0) {
      newItems = [...this.state.items];
      newItems[existingIndex] = { ...updated, userEdited: true };
    } else {
      newItems = [updated, ...this.state.items];
    }
    this.state = { ...this.state, items: newItems };
    this.notify();
    this.saveToStorage();
  }

  public toggleItemCompleted(id: string) {
    const item = this.state.items.find(i => i.id === id);
    if (!item) return;
    this.updateItem({
      ...item,
      completed: !item.completed,
      submittedAt: !item.completed ? new Date().toISOString() : undefined
    });
  }

  public deleteItem(id: string) {
    this.state = {
      ...this.state,
      items: this.state.items.filter(i => i.id !== id)
    };
    this.notify();
    this.saveToStorage();
  }

  public addItem(item: Omit<GradedItem, 'id' | 'completed'>) {
    const newItem: GradedItem = {
      ...item,
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      source: 'custom',
      completed: false,
      userEdited: true
    };
    this.state = { ...this.state, items: [newItem, ...this.state.items] };
    this.notify();
    this.saveToStorage();
    return newItem;
  }

  public updateSettings(partial: Partial<CompassSettings>) {
    this.state = {
      ...this.state,
      settings: { ...this.state.settings, ...partial }
    };
    this.notify();
    this.saveToStorage();
  }

  public addLog(category: DebugLogEntry['category'], level: DebugLogEntry['level'], message: string, payload?: any, courseId?: string) {
    const log: DebugLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      payload,
      courseId
    };
    // Keep last 300 logs
    const newLogs = [log, ...this.state.logs].slice(0, 300);
    this.state = { ...this.state, logs: newLogs };
    this.notify();
  }

  public setCourses(courses: CanvasCourse[]) {
    this.state = { ...this.state, courses };
    this.notify();
    this.saveToStorage();
  }

  public updateCourseScanStatus(status: CourseScanStatus) {
    this.state = {
      ...this.state,
      scanStatuses: {
        ...this.state.scanStatuses,
        [status.courseId]: status
      }
    };
    this.notify();
    this.saveToStorage();
  }

  public toggleCourseTracking(courseId: string) {
    const current = this.state.settings.disabledCourseIds || [];
    const isCurrentlyDisabled = current.includes(courseId);
    const newDisabled = isCurrentlyDisabled 
      ? current.filter(id => id !== courseId)
      : [...current, courseId];
    this.updateSettings({ disabledCourseIds: newDisabled });
    this.addLog('ui', 'info', `${isCurrentlyDisabled ? 'Resumed tracking' : 'Muted / Opted out of'} course ${courseId}`);
  }

  public isCourseTracked(courseId: string): boolean {
    return !(this.state.settings.disabledCourseIds || []).includes(courseId);
  }

  public addItemsBatch(newItems: GradedItem[]) {
    this.state = {
      ...this.state,
      items: [...newItems, ...this.state.items]
    };
    this.notify();
    this.saveToStorage();
  }

  public setItems(items: GradedItem[]) {
    this.state = {
      ...this.state,
      items
    };
    this.notify();
    this.saveToStorage();
  }

  public setOfficeHours(courseId: string, hours: CourseOfficeHours) {
    this.state = {
      ...this.state,
      officeHours: {
        ...this.state.officeHours,
        [courseId]: hours
      }
    };
    this.notify();
    this.saveToStorage();
  }

  public replaceCourseItems(courseId: string, newCourseItems: GradedItem[]) {
    // Preserve custom items and explicitly user-edited items
    const existingCourseItems = this.state.items.filter(i => i.courseId === courseId);
    const existingMap = new Map(existingCourseItems.map(i => [i.id, i]));

    const preservedCustomItems = existingCourseItems.filter(i => i.source === 'custom');
    const otherCourseItems = this.state.items.filter(i => i.courseId !== courseId);

    // Merge new items, carrying forward manual completion state if user edited it
    const processedNewItems: GradedItem[] = newCourseItems.map(newItem => {
      const existing = existingMap.get(newItem.id);
      if (existing && existing.userEdited) {
        return {
          ...newItem,
          completed: existing.completed,
          userEdited: true,
          submittedAt: existing.submittedAt
        };
      }
      return newItem;
    });

    const preservedIds = new Set(preservedCustomItems.map(i => i.id));
    const itemsToAdd = processedNewItems.filter(i => !preservedIds.has(i.id));

    this.state = {
      ...this.state,
      items: [...itemsToAdd, ...preservedCustomItems, ...otherCourseItems]
    };
    this.notify();
    this.saveToStorage();
  }

  public restoreMockItems() {
    const existingIds = new Set(this.state.items.map(i => i.id));
    const toRestore = MOCK_ITEMS.filter(i => !existingIds.has(i.id));
    this.state = {
      ...this.state,
      items: [...toRestore, ...this.state.items]
    };
    this.notify();
    this.saveToStorage();
  }

  public clearMockItems() {
    this.state = {
      ...this.state,
      items: this.state.items.filter(i => !i.id.startsWith('mock-'))
    };
    this.notify();
    this.saveToStorage();
  }
}

export const store = new StateStore();
