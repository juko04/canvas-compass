import { StoreState, store } from '../../storage/store';
import { generateIcsForItems } from '../../export/ics';
import { exportStateToJson } from '../../export/json';
import { ThemeMode } from '../../types/settings';
import { getSvgIcon } from '../icons';

export function renderSettingsView(state: StoreState): HTMLElement {
  const container = document.createElement('div');
  container.className = 'settings-view';
  container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const settings = state.settings;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 7px;">
        ${getSvgIcon('settings', 16)}
        <span>Extension Settings</span>
      </h3>
      <button class="glass-btn back-to-list-btn" style="font-size: 11px; padding: 4px 10px;">
        ${getSvgIcon('arrow-left', 12)}
        <span>Back to List</span>
      </button>
    </div>

    <!-- Canvas Connection -->
    <div class="glass-card" style="cursor: default;">
      <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-gold); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        ${getSvgIcon('course', 14)}
        <span>Canvas Institution Host</span>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
        Default is University of Colorado Boulder (canvas.colorado.edu).
      </div>
      <input type="text" class="glass-input canvas-host-input" value="${escapeHtml(settings.canvasHost)}" style="width: 100%;" />
    </div>

    <!-- Appearance -->
    <div class="glass-card" style="cursor: default;">
      <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-gold); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        ${getSvgIcon('sparkles', 14)}
        <span>Appearance & Theme</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="glass-btn theme-btn ${settings.theme === 'auto' ? 'primary' : ''}" data-theme="auto" style="flex: 1;">Auto (System)</button>
        <button class="glass-btn theme-btn ${settings.theme === 'dark' ? 'primary' : ''}" data-theme="dark" style="flex: 1;">Dark Glass</button>
        <button class="glass-btn theme-btn ${settings.theme === 'light' ? 'primary' : ''}" data-theme="light" style="flex: 1;">Light Glass</button>
      </div>
      <div style="margin-top: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; cursor: pointer;">
          <input type="checkbox" class="reduced-motion-checkbox" ${settings.reducedMotion ? 'checked' : ''} />
          <span>Respect reduced motion (disable spring animations)</span>
        </label>
      </div>
    </div>

    <!-- Gemini AI Opt-In -->
    <div class="glass-card" style="cursor: default;">
      <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-gold); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        ${getSvgIcon('sparkles', 14)}
        <span>Tier 2 AI Parser (Gemini)</span>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
        Opt-in BYO API key for enhanced parsing and AI-assisted syllabus matching. Data leaves the browser only to Gemini when enabled.
      </div>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; margin-bottom: 8px; cursor: pointer;">
        <input type="checkbox" class="ai-enabled-checkbox" ${settings.aiEnabled ? 'checked' : ''} />
        <span>Enable Gemini Flash AI Parser</span>
      </label>
      <div class="ai-config-fields" style="${settings.aiEnabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
        <label style="font-size: 10.5px; color: var(--text-secondary); font-weight: 600;">Google Gemini API Key</label>
        <input type="password" class="glass-input gemini-key-input" placeholder="AIzaSy..." value="${escapeHtml(settings.geminiApiKey || '')}" style="width: 100%; margin-top: 2px; margin-bottom: 8px;" />
        <label style="font-size: 10.5px; color: var(--text-secondary); font-weight: 600;">Model</label>
        <select class="glass-select gemini-model-select" style="width: 100%; margin-top: 2px;">
          <option value="gemini-1.5-flash" ${settings.geminiModel === 'gemini-1.5-flash' ? 'selected' : ''}>gemini-1.5-flash (Recommended, Fast & Free Tier)</option>
          <option value="gemini-2.0-flash" ${settings.geminiModel === 'gemini-2.0-flash' ? 'selected' : ''}>gemini-2.0-flash (Latest)</option>
        </select>
      </div>
    </div>

    <!-- Ranking Weights -->
    <div class="glass-card" style="cursor: default;">
      <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-gold); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        ${getSvgIcon('sliders', 14)}
        <span>Relevance Ranking Tuning</span>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">
        Adjust weights used to score urgency, importance, and estimated effort.
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11.5px;">
        <div>
          <div style="display: flex; justify-content: space-between;">
            <span>Urgency (Due Date Proximity):</span>
            <span class="urgency-weight-label font-mono">${Math.round(settings.rankingWeights.urgencyWeight * 100)}%</span>
          </div>
          <input type="range" min="0" max="100" class="urgency-slider" value="${Math.round(settings.rankingWeights.urgencyWeight * 100)}" style="width: 100%;" />
        </div>
        <div>
          <div style="display: flex; justify-content: space-between;">
            <span>Importance (Points & Weights):</span>
            <span class="importance-weight-label font-mono">${Math.round(settings.rankingWeights.importanceWeight * 100)}%</span>
          </div>
          <input type="range" min="0" max="100" class="importance-slider" value="${Math.round(settings.rankingWeights.importanceWeight * 100)}" style="width: 100%;" />
        </div>
      </div>
    </div>

    <!-- Export & Backup -->
    <div class="glass-card" style="cursor: default;">
      <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-gold); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        ${getSvgIcon('download', 14)}
        <span>Calendar & Data Export</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="glass-btn primary export-all-ics-btn" style="flex: 1;">
          ${getSvgIcon('calendar', 12)}
          <span>Export All (.ics)</span>
        </button>
        <button class="glass-btn export-json-btn" style="flex: 1;">
          ${getSvgIcon('database', 12)}
          <span>Export JSON Backup</span>
        </button>
      </div>
    </div>
  `;

  // Event handlers
  container.querySelector('.back-to-list-btn')?.addEventListener('click', () => {
    store.setView('relevance');
  });

  // Host input
  const hostInput = container.querySelector('.canvas-host-input') as HTMLInputElement;
  hostInput?.addEventListener('change', () => {
    store.updateSettings({ canvasHost: hostInput.value.trim() || 'canvas.colorado.edu' });
  });

  // Theme buttons
  const themeBtns = container.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = (btn as HTMLElement).dataset.theme as ThemeMode;
      store.updateSettings({ theme: mode });
    });
  });

  // Reduced motion
  const motionCheckbox = container.querySelector('.reduced-motion-checkbox') as HTMLInputElement;
  motionCheckbox?.addEventListener('change', () => {
    store.updateSettings({ reducedMotion: motionCheckbox.checked });
  });

  // AI fields
  const aiCheckbox = container.querySelector('.ai-enabled-checkbox') as HTMLInputElement;
  const keyInput = container.querySelector('.gemini-key-input') as HTMLInputElement;
  const modelSelect = container.querySelector('.gemini-model-select') as HTMLSelectElement;
  const aiFields = container.querySelector('.ai-config-fields') as HTMLElement;

  aiCheckbox?.addEventListener('change', () => {
    store.updateSettings({ aiEnabled: aiCheckbox.checked });
    aiFields.style.opacity = aiCheckbox.checked ? '1' : '0.5';
    aiFields.style.pointerEvents = aiCheckbox.checked ? 'auto' : 'none';
  });

  keyInput?.addEventListener('change', () => {
    store.updateSettings({ geminiApiKey: keyInput.value.trim() });
  });

  modelSelect?.addEventListener('change', () => {
    store.updateSettings({ geminiModel: modelSelect.value });
  });

  // Weight sliders
  const urgencySlider = container.querySelector('.urgency-slider') as HTMLInputElement;
  const importanceSlider = container.querySelector('.importance-slider') as HTMLInputElement;
  const urgencyLabel = container.querySelector('.urgency-weight-label') as HTMLElement;
  const importanceLabel = container.querySelector('.importance-weight-label') as HTMLElement;

  const updateWeights = () => {
    const uVal = parseInt(urgencySlider.value, 10) / 100;
    const iVal = parseInt(importanceSlider.value, 10) / 100;
    const eVal = Math.max(0, 1 - (uVal + iVal));

    urgencyLabel.textContent = `${Math.round(uVal * 100)}%`;
    importanceLabel.textContent = `${Math.round(iVal * 100)}%`;

    store.updateSettings({
      rankingWeights: {
        urgencyWeight: uVal,
        importanceWeight: iVal,
        effortWeight: eVal
      }
    });
  };

  urgencySlider?.addEventListener('input', updateWeights);
  importanceSlider?.addEventListener('input', updateWeights);

  // Export handlers
  container.querySelector('.export-all-ics-btn')?.addEventListener('click', () => {
    const ics = generateIcsForItems(state.items, 'Canvas Compass — All Courses');
    downloadFile(ics, 'canvas-compass-all.ics', 'text/calendar');
    store.addLog('ui', 'info', `Exported full semester calendar (${state.items.length} items)`);
  });

  container.querySelector('.export-json-btn')?.addEventListener('click', () => {
    const json = exportStateToJson(state);
    downloadFile(json, 'canvas-compass-backup.json', 'application/json');
    store.addLog('ui', 'info', 'Exported JSON backup of all items and courses');
  });

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
