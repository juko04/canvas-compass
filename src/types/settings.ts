export interface RankingWeights {
  urgencyWeight: number;    // default 0.45
  importanceWeight: number; // default 0.40
  effortWeight: number;     // default 0.15
}

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface CompassSettings {
  canvasHost: string;              // default 'canvas.colorado.edu'
  theme: ThemeMode;                // default 'auto'
  geminiApiKey?: string;
  geminiModel: string;             // default 'gemini-1.5-flash'
  aiEnabled: boolean;              // default false
  defaultDueTime: string;          // default '23:59'
  rankingWeights: RankingWeights;
  reducedMotion: boolean;          // auto-detected or overridden
  buttonPosition: { top: number; right: number }; // floating button coordinates
  disabledCourseIds: string[];     // Courses opted out of scanning / tracking (e.g. TA courses)
}

export const DEFAULT_SETTINGS: CompassSettings = {
  canvasHost: 'canvas.colorado.edu',
  theme: 'auto',
  geminiModel: 'gemini-1.5-flash',
  aiEnabled: false,
  defaultDueTime: '23:59',
  rankingWeights: {
    urgencyWeight: 0.45,
    importanceWeight: 0.40,
    effortWeight: 0.15,
  },
  reducedMotion: false,
  buttonPosition: { top: 20, right: 20 },
  disabledCourseIds: []
};
