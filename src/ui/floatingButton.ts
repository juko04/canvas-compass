import { store, StoreState } from '../storage/store';
import { calculateGlobalUrgency } from '../rank/ranker';
import { getUrgencyColor } from './liquidGlass';
import { GradedItem } from '../types/items';

export class FloatingCompassButton {
  private element: HTMLElement;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialX = 0;
  private initialY = 0;
  private hasMoved = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'compass-float-btn';
    this.element.title = 'Canvas Compass — Course Deadlines & Tasks';

    this.render();
    this.setupDrag();

    store.subscribe((state) => {
      this.updateState(state);
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private render() {
    const state = store.getState();
    const disabledIds = state.settings.disabledCourseIds || [];
    const trackedItems = state.items.filter(i => !disabledIds.includes(i.courseId));
    const urgency = calculateGlobalUrgency(trackedItems);
    const colors = getUrgencyColor(urgency);

    this.element.style.setProperty('--urgency-bg', `linear-gradient(135deg, ${colors.primary}, ${adjustBrightness(colors.primary, -20)})`);
    this.element.style.setProperty('--urgency-glow', colors.glow);

    // Apply saved coordinates
    const pos = state.settings.buttonPosition || { top: 20, right: 20 };
    this.element.style.top = `${pos.top}px`;
    this.element.style.right = `${pos.right}px`;

    const activeCount = calculate7DayNotificationCount(state.items, disabledIds);

    this.element.innerHTML = `
      <svg class="compass-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="white"></polygon>
      </svg>
      ${activeCount > 0 ? `<div class="compass-badge-pip">${activeCount}</div>` : ''}
    `;

    this.element.addEventListener('click', () => {
      if (!this.hasMoved) {
        store.togglePanel();
      }
    });
  }

  private updateState(state: StoreState) {
    const disabledIds = state.settings.disabledCourseIds || [];
    const trackedItems = state.items.filter(i => !disabledIds.includes(i.courseId));
    const urgency = calculateGlobalUrgency(trackedItems);
    const colors = getUrgencyColor(urgency);

    this.element.style.setProperty('--urgency-bg', `linear-gradient(135deg, ${colors.primary}, ${adjustBrightness(colors.primary, -20)})`);
    this.element.style.setProperty('--urgency-glow', colors.glow);

    if (state.panelOpen) {
      this.element.classList.add('docked');
      this.element.classList.add('panel-open');
    } else {
      this.element.classList.remove('docked');
      this.element.classList.remove('panel-open');
      const pos = state.settings.buttonPosition || { top: 20, right: 20 };
      this.element.style.top = `${pos.top}px`;
      this.element.style.right = `${pos.right}px`;
    }

    const activeCount = calculate7DayNotificationCount(state.items, disabledIds);
    let badge = this.element.querySelector('.compass-badge-pip');
    if (activeCount > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'compass-badge-pip';
        this.element.appendChild(badge);
      }
      badge.textContent = `${activeCount}`;
    } else if (badge) {
      badge.remove();
    }
  }

  private setupDrag() {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // only left click
      if (store.getState().panelOpen) {
        // When docked at top of open panel, do not drag - allows smooth click to close
        return;
      }
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const rect = this.element.getBoundingClientRect();
      this.initialX = rect.right;
      this.initialY = rect.top;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.hasMoved = true;
      }

      // Calculate new position
      const newTop = Math.max(10, Math.min(window.innerHeight - 54, this.initialY + deltaY));
      const newRight = Math.max(10, Math.min(window.innerWidth - 54, (window.innerWidth - this.initialX) - deltaX));

      this.element.style.top = `${newTop}px`;
      this.element.style.right = `${newRight}px`;
    };

    const onMouseUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (this.hasMoved) {
          const rect = this.element.getBoundingClientRect();
          const savedTop = Math.round(rect.top);
          const savedRight = Math.round(window.innerWidth - rect.right);

          store.updateSettings({
            buttonPosition: { top: savedTop, right: savedRight }
          });
        }
      }
    };

    this.element.addEventListener('mousedown', onMouseDown);
  }
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export function calculate7DayNotificationCount(items: GradedItem[], disabledCourseIds: string[] = []): number {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  return items.filter(item => {
    if (item.completed) return false;
    if (disabledCourseIds.includes(item.courseId)) return false;
    if (!item.dueDate) return false;
    // Count active items due within the upcoming 7 days (or overdue)
    return item.dueDate <= endStr;
  }).length;
}
