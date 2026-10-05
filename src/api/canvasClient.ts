import { CanvasCourse, CanvasAssignment, CanvasFile, CanvasPage, CanvasCalendarEvent } from '../types/canvas';
import { GradedItem } from '../types/items';
import { store } from '../storage/store';

export class CanvasApiClient {
  private host: string;
  private queue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minIntervalMs = 200; // 5 req/sec

  constructor(host: string = 'canvas.colorado.edu') {
    this.host = host;
  }

  public setHost(host: string) {
    this.host = host;
  }

  public getHost(): string {
    if (typeof window !== 'undefined' && window.location && window.location.host && window.location.host.includes('canvas')) {
      return window.location.host;
    }
    const settingHost = store.getState()?.settings?.canvasHost;
    if (settingHost) return settingHost;
    return this.host || 'canvas.colorado.edu';
  }

  /**
   * Rate-limited fetch with exponential backoff on HTTP 429
   */
  private async fetchWithBackoff<T>(endpoint: string, retries = 2, delayMs = 500): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const now = Date.now();
        const wait = Math.max(0, this.minIntervalMs - (now - this.lastRequestTime));
        if (wait > 0) {
          await new Promise(r => setTimeout(r, wait));
        }
        this.lastRequestTime = Date.now();

        const activeHost = this.getHost();
        const url = endpoint.startsWith('http') ? endpoint : `https://${activeHost}/api/v1/${endpoint}`;
        store.addLog('api', 'debug', `GET ${endpoint}`);

        let currentRetries = retries;
        let currentDelay = delayMs;

        while (true) {
          try {
            const resp = await fetch(url, {
              credentials: 'include', // Includes existing Canvas session cookie
              headers: {
                'Accept': 'application/json'
              }
            });

            // Only retry on genuine Canvas rate limit (HTTP 429). HTTP 403 is permission restriction, not rate limit.
            if (resp.status === 429 && currentRetries > 0) {
              store.addLog('api', 'warn', `Canvas rate limited (429), backing off ${currentDelay}ms for ${endpoint}`);
              await new Promise(r => setTimeout(r, currentDelay));
              currentRetries--;
              currentDelay *= 2;
              continue;
            }

            if (!resp.ok) {
              throw new Error(`Canvas API error ${resp.status} ${resp.statusText}`);
            }

            const data = await resp.json();
            resolve(data);
            return;
          } catch (err: any) {
            // Only retry transient network errors
            if (currentRetries > 0 && err.message?.includes('Failed to fetch')) {
              await new Promise(r => setTimeout(r, currentDelay));
              currentRetries--;
              currentDelay *= 2;
              continue;
            }
            store.addLog('api', 'error', `Failed fetching ${endpoint}: ${err.message}`);
            reject(err);
            return;
          }
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (err) {
          console.error('[CanvasApiClient] Queue task unhandled error:', err);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  /**
   * 1. Get favorited courses, falling back to active courses if favorites are empty
   */
  public async getFavoriteOrActiveCourses(): Promise<CanvasCourse[]> {
    try {
      const favs = await this.getFavoriteCourses();
      if (Array.isArray(favs) && favs.length > 0) {
        return favs;
      }
    } catch (err: any) {
      store.addLog('api', 'warn', `Favorites check returned error: ${err.message}. Trying active courses...`);
    }
    return this.fetchWithBackoff<CanvasCourse[]>('courses?enrollment_state=active&include[]=term&per_page=50');
  }

  /**
   * Get favorited courses
   */
  public async getFavoriteCourses(): Promise<CanvasCourse[]> {
    return this.fetchWithBackoff<CanvasCourse[]>('users/self/favorites/courses?include[]=term');
  }

  /**
   * Download binary file (PDF / DOCX) without JSON parsing
   */
  public async downloadFileBytes(url: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        store.addLog('api', 'debug', `Downloading binary file from ${url.slice(0, 90)}...`);
        try {
          const resp = await fetch(url, {
            credentials: 'include'
          });
          if (!resp.ok) {
            throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
          }
          const buffer = await resp.arrayBuffer();
          resolve(new Uint8Array(buffer));
        } catch (err: any) {
          store.addLog('api', 'error', `Failed downloading file: ${err.message}`);
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  /**
   * 2. Get course details with syllabus_body
   */
  public async getCourseDetails(courseId: number): Promise<CanvasCourse> {
    return this.fetchWithBackoff<CanvasCourse>(`courses/${courseId}?include[]=syllabus_body&include[]=term`);
  }

  /**
   * 3. Get live assignments
   */
  public async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    return this.fetchWithBackoff<CanvasAssignment[]>(`courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`);
  }

  /**
   * 4. Get quizzes
   */
  public async getQuizzes(courseId: number): Promise<any[]> {
    try {
      return await this.fetchWithBackoff<any[]>(`courses/${courseId}/quizzes?per_page=100`);
    } catch {
      return [];
    }
  }

  /**
   * 5. Get files (PDFs and DOCX)
   */
  public async getFiles(courseId: number): Promise<CanvasFile[]> {
    try {
      return await this.fetchWithBackoff<CanvasFile[]>(`courses/${courseId}/files?per_page=100&sort=updated_at`);
    } catch {
      return [];
    }
  }

  /**
   * 6. Get pages
   */
  public async getPages(courseId: number): Promise<CanvasPage[]> {
    try {
      return await this.fetchWithBackoff<CanvasPage[]>(`courses/${courseId}/pages?per_page=100`);
    } catch {
      return [];
    }
  }

  /**
   * 7. Get page content
   */
  public async getPageContent(courseId: number, pageUrl: string): Promise<CanvasPage> {
    return this.fetchWithBackoff<CanvasPage>(`courses/${courseId}/pages/${pageUrl}`);
  }

  /**
   * 8. Get calendar events
   */
  public async getCalendarEvents(courseId: number): Promise<CanvasCalendarEvent[]> {
    try {
      return await this.fetchWithBackoff<CanvasCalendarEvent[]>(`calendar_events?context_codes[]=course_${courseId}&type=event&per_page=100`);
    } catch {
      return [];
    }
  }

  /**
   * 9. Get modules with items (used to find syllabus files/pages when Files tab is restricted)
   */
  public async getModules(courseId: number): Promise<any[]> {
    try {
      return await this.fetchWithBackoff<any[]>(`courses/${courseId}/modules?include[]=items&per_page=50`);
    } catch {
      return [];
    }
  }

  /**
   * 10. Get single file details
   */
  public async getFile(fileId: number | string): Promise<CanvasFile | null> {
    try {
      return await this.fetchWithBackoff<CanvasFile>(`files/${fileId}`);
    } catch {
      return null;
    }
  }

  /**
   * 11. Get course instructors / teaching staff
   */
  public async getCourseInstructors(courseId: number): Promise<{ name?: string; email?: string }[]> {
    try {
      const users = await this.fetchWithBackoff<any[]>(`courses/${courseId}/users?enrollment_type[]=teacher&include[]=email&per_page=10`);
      if (Array.isArray(users) && users.length > 0) {
        return users.map(u => ({ name: u.name || u.sortable_name, email: u.email }));
      }
    } catch {
      // Endpoint may be restricted for students in certain Canvas roles; fallback cleanly
    }
    return [];
  }

  /**
   * Converts Canvas REST assignment objects into normalized GradedItems
   */
  public mapAssignmentsToGradedItems(assignments: CanvasAssignment[], course: CanvasCourse): GradedItem[] {
    return assignments.map(a => {
      let dueDate: string | null = null;
      let dueTime: string | null = null;

      if (a.due_at) {
        const d = new Date(a.due_at);
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        dueDate = `${y}-${m}-${day}`;
        dueTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }

      // Detect type
      let type: GradedItem['type'] = 'assignment';
      const nameLower = a.name.toLowerCase();
      if (nameLower.includes('exam') || nameLower.includes('midterm') || nameLower.includes('final')) {
        type = 'exam';
      } else if (nameLower.includes('quiz')) {
        type = 'quiz';
      } else if (nameLower.includes('project') || nameLower.includes('capstone')) {
        type = 'project';
      } else if (nameLower.includes('presentation') || nameLower.includes('demo') || nameLower.includes('showcase')) {
        type = 'presentation';
      } else if (nameLower.includes('lab')) {
        type = 'lab';
      } else if (nameLower.includes('extra credit')) {
        type = 'extra_credit';
      }

      const isSubmitted = a.submission?.workflow_state === 'submitted' ||
                          a.submission?.workflow_state === 'graded' ||
                          !!a.has_submitted_submissions;
      const submittedAt = a.submission?.submitted_at || undefined;
      const canvasUrl = a.html_url || `https://canvas.colorado.edu/courses/${course.id}/assignments/${a.id}`;

      return {
        id: `canvas-assign-${a.id}`,
        courseId: String(course.id),
        courseName: course.name,
        courseColor: course.color || '#CFB87C',
        title: a.name,
        type,
        dueDate,
        dueTime,
        points: a.points_possible,
        weight: null,
        isTBD: !a.due_at,
        isUndated: !a.due_at,
        isInferred: false,
        source: 'canvas',
        sourceDoc: 'Canvas Live API',
        notes: a.description ? stripHtml(a.description).slice(0, 160) : undefined,
        canvasUrl,
        isCanvasSubmitted: isSubmitted,
        submittedAt,
        completed: isSubmitted
      };
    });
  }
}

function pad(num: number): string {
  return num < 10 ? '0' + num : String(num);
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export const canvasApi = new CanvasApiClient();
