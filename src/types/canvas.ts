export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
  term?: {
    id: number;
    name: string;
    start_at: string | null;
    end_at: string | null;
  };
  syllabus_body?: string;
  color?: string;
  is_favorite?: boolean;
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name: string;
  description?: string;
  due_at: string | null;
  points_possible: number | null;
  grading_type?: string;
  has_submitted_submissions?: boolean;
  submission_types?: string[];
  updated_at: string;
  html_url?: string;
  submission?: {
    workflow_state?: string;
    submitted_at?: string | null;
    id?: number;
    score?: number | null;
  };
}

export interface CanvasCalendarEvent {
  id: number;
  title: string;
  start_at: string | null;
  end_at: string | null;
  description?: string;
  context_code: string;
  workflow_state?: string;
}

export interface CanvasFile {
  id: number;
  folder_id: number;
  display_name: string;
  filename: string;
  url: string;
  size: number;
  'content-type': string;
  updated_at: string;
}

export interface CanvasPage {
  page_id: number;
  url: string;
  title: string;
  body?: string;
  updated_at: string;
}

export interface CourseScanStatus {
  courseId: string;
  courseName: string;
  courseColor?: string;
  status: 'idle' | 'queued' | 'scanning' | 'success' | 'partial' | 'failed';
  message?: string;
  docsFound: number;
  itemsExtracted: number;
  lastScanned?: string;
  error?: string;
}
