import { StoreState } from '../storage/store';

export function exportStateToJson(state: StoreState): string {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    app: 'Canvas Compass',
    courses: state.courses,
    items: state.items,
    settings: {
      ...state.settings,
      geminiApiKey: undefined // Never export private API key for security
    }
  };
  return JSON.stringify(exportPayload, null, 2);
}
