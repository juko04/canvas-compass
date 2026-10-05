export type ItemType =
  | 'assignment'
  | 'quiz'
  | 'exam'
  | 'project'
  | 'presentation'
  | 'lab'
  | 'reading'
  | 'extra_credit'
  | 'attendance'
  | 'checkin'
  | 'no_class';

export type ItemSource = 'canvas' | 'syllabus' | 'custom';

export interface GradedItem {
  id: string; // unique ID
  courseId: string;
  courseName: string;
  courseColor: string; // e.g. '#CFB87C' (CU Gold)
  title: string;
  type: ItemType;
  dueDate: string | null; // ISO YYYY-MM-DD or null if TBD / undated
  dueTime: string | null; // e.g. '23:59', '10:00' or null
  points: number | null;
  weight: number | null; // percentage e.g. 15 for 15%
  isTBD: boolean;
  isUndated: boolean;
  isInferred: boolean; // recurring expansion inferred
  source: ItemSource;
  sourceDoc?: string;
  sourceSnippet?: string;
  confidence?: number; // 0.0 - 1.0
  notes?: string;
  completed: boolean;
  submittedAt?: string;
  hasConflict?: boolean;
  conflictDetails?: {
    syllabusValue?: string;
    canvasValue?: string;
    field: string;
  };
  relevanceScore?: number;
  userEdited?: boolean;
  canvasUrl?: string;
  isCanvasSubmitted?: boolean;
}

export interface CourseOfficeHours {
  instructorName?: string;
  email?: string;
  officeHours?: string;
  zoomUrl?: string;
  location?: string;
}

export type BucketType = 'this_week' | 'on_the_horizon' | 'later' | 'completed';

export interface RankedItem extends GradedItem {
  bucket: BucketType;
  relevanceScore: number;
}

