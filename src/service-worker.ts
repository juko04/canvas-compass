import { DEFAULT_SETTINGS } from './types/settings';

// Service worker lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Canvas Compass Service Worker] Installed:', details.reason);

  // Initialize default settings if absent
  const existing = await chrome.storage.local.get('canvas_compass_settings');
  if (!existing.canvas_compass_settings) {
    await chrome.storage.local.set({
      'canvas_compass_settings': DEFAULT_SETTINGS
    });
  }

  // Periodic deadline reminder check (every 30 mins)
  chrome.alarms.create('check_due_dates', { periodInMinutes: 30 });
});

// Periodic alarm handler for urgent deadline alerts
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check_due_dates') {
    try {
      const data = await chrome.storage.local.get('canvas_compass_items');
      const items = data.canvas_compass_items;
      if (!Array.isArray(items)) return;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const urgentDueToday = items.filter((i: any) => !i.completed && i.dueDate === todayStr);
      if (urgentDueToday.length > 0) {
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Canvas Compass Reminder',
          message: `You have ${urgentDueToday.length} assignment${urgentDueToday.length > 1 ? 's' : ''} due today!`
        });
      }
    } catch (e) {
      console.warn('[Canvas Compass Service Worker] Alarm check error:', e);
    }
  }
});

// Extension toolbar icon click — sends a message to active Canvas tab to toggle panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url && tab.url.includes('canvas')) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_COMPASS_PANEL' });
    } catch {
      console.log('[Canvas Compass Service Worker] Content script not ready on tab yet.');
    }
  } else {
    // Open Canvas in a new tab if not on Canvas
    chrome.tabs.create({ url: 'https://canvas.colorado.edu' });
  }
});

// Message listener for background tasks (e.g. Gemini API requests from content script)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GEMINI_GENERATE') {
    (async () => {
      try {
        const { apiKey, modelName, prompt } = message.payload;
        if (!apiKey) {
          sendResponse({ success: false, error: 'Gemini API key is required.' });
          return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          sendResponse({ success: false, error: `Gemini API error (${resp.status}): ${errText}` });
          return;
        }

        const data = await resp.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        sendResponse({ success: true, text: candidateText });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message || 'Unknown network error' });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
