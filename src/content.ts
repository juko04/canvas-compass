import { getLiquidGlassStyles } from './ui/liquidGlass';
import { FloatingCompassButton } from './ui/floatingButton';
import { CompassPanel } from './ui/panel';
import { store } from './storage/store';
import { syncCoursesFromCanvas } from './api/scanner';

function initCanvasCompass() {
  // Prevent duplicate injection
  if (document.getElementById('canvas-compass-root')) {
    return;
  }

  const hostEl = document.createElement('div');
  hostEl.id = 'canvas-compass-root';
  const target = document.body || document.documentElement;
  target.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Style element
  const styleEl = document.createElement('style');
  styleEl.textContent = getLiquidGlassStyles(store.getState().settings.theme);
  shadow.appendChild(styleEl);

  // Floating Button
  const floatBtn = new FloatingCompassButton();
  shadow.appendChild(floatBtn.getElement());

  // Main Slide Panel
  const panel = new CompassPanel();
  shadow.appendChild(panel.getElement());

  // Listen for theme changes to regenerate styles
  let lastTheme = store.getState().settings.theme;
  store.subscribe((state) => {
    if (state.settings.theme !== lastTheme) {
      lastTheme = state.settings.theme;
      styleEl.textContent = getLiquidGlassStyles(state.settings.theme);
    }
  });

  // Keyboard shortcut: Option+C / Alt+C to toggle panel
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      store.togglePanel();
    }
  });

  // Listen for toolbar extension icon clicks from service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'TOGGLE_COMPASS_PANEL') {
        store.togglePanel();
        sendResponse({ success: true, panelOpen: store.getState().panelOpen });
      }
      return true;
    });
  }

  console.log('[Canvas Compass] Initialized on Canvas page inside Shadow DOM.');
  store.addLog('ui', 'info', 'Canvas Compass UI injected into page.');

  // Automatically sync courses from Canvas if user is on Canvas
  if (typeof window !== 'undefined' && window.location && window.location.host.includes('canvas')) {
    syncCoursesFromCanvas(false).catch(err => {
      console.warn('[Canvas Compass] Auto-sync notice:', err);
    });
  }
}

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvasCompass);
} else {
  initCanvasCompass();
}
