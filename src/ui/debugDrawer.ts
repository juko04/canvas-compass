import { StoreState, store } from '../storage/store';
import { getSvgIcon } from './icons';

export class DebugDrawer {
  private element: HTMLElement;
  private selectedCategory: string = 'all';

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'debug-drawer';
    this.render();

    store.subscribe((state) => {
      this.updateState(state);
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private render() {
    const state = store.getState();
    if (state.debugDrawerOpen) {
      this.element.classList.add('open');
    } else {
      this.element.classList.remove('open');
    }

    this.element.innerHTML = `
      <div class="debug-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 12px; color: var(--accent-gold); display: flex; align-items: center; gap: 5px;">
            ${getSvgIcon('tools', 13)}
            <span>Diagnostic Log</span>
          </span>
          <select class="glass-select log-filter-category" style="padding: 2px 6px; font-size: 11px;">
            <option value="all">All Logs (${state.logs.length})</option>
            <option value="api">Canvas API</option>
            <option value="parser">PDF / Docx Parser</option>
            <option value="ai">Gemini AI</option>
            <option value="merge">Merge & Match</option>
          </select>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="glass-btn copy-logs-btn" style="padding: 2px 8px; font-size: 10px;">
            ${getSvgIcon('file-text', 11)}
            <span>Copy</span>
          </button>
          <button class="glass-btn clear-logs-btn" style="padding: 2px 8px; font-size: 10px;">Clear</button>
          <button class="glass-icon-btn close-drawer-btn" style="width: 24px; height: 24px; padding: 0;">${getSvgIcon('close', 11)}</button>
        </div>
      </div>
      <div class="debug-log-list"></div>
    `;

    this.renderLogs(state);

    // Event listeners
    this.element.querySelector('.close-drawer-btn')?.addEventListener('click', () => {
      store.setDebugDrawerOpen(false);
    });

    this.element.querySelector('.clear-logs-btn')?.addEventListener('click', () => {
      store.getState().logs.length = 0;
      this.renderLogs(store.getState());
    });

    this.element.querySelector('.copy-logs-btn')?.addEventListener('click', () => {
      const logText = store.getState().logs.map(l => `[${l.timestamp}] [${l.category.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message} ${l.payload ? JSON.stringify(l.payload) : ''}`).join('\n');
      navigator.clipboard.writeText(logText);
      alert('Logs copied to clipboard!');
    });

    const categorySelect = this.element.querySelector('.log-filter-category') as HTMLSelectElement;
    categorySelect?.addEventListener('change', () => {
      this.selectedCategory = categorySelect.value;
      this.renderLogs(store.getState());
    });
  }

  private updateState(state: StoreState) {
    if (state.debugDrawerOpen) {
      this.element.classList.add('open');
    } else {
      this.element.classList.remove('open');
    }
    this.renderLogs(state);
  }

  private renderLogs(state: StoreState) {
    const list = this.element.querySelector('.debug-log-list');
    if (!list) return;

    let filtered = state.logs;
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(l => l.category === this.selectedCategory);
    }

    if (filtered.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-style: italic; padding: 8px;">No diagnostic log entries recorded.</div>`;
      return;
    }

    list.innerHTML = filtered.map(log => {
      const time = log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp;
      let levelClass = 'log-info';
      if (log.level === 'warn') levelClass = 'log-warn';
      if (log.level === 'error') levelClass = 'log-error';

      return `
        <div class="log-row">
          <span style="color: var(--text-muted);">[${time}]</span>
          <span style="color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">[${log.category}]</span>
          <span class="${levelClass}">${escapeHtml(log.message)}</span>
        </div>
      `;
    }).join('');
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
