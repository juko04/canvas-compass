export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  courseId?: string;
  level: LogLevel;
  category: 'api' | 'parser' | 'ai' | 'merge' | 'ui' | 'storage';
  message: string;
  payload?: any;
}
