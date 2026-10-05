import { GradedItem } from '../types/items';
import { CanvasCourse, CourseScanStatus } from '../types/canvas';

export const MOCK_COURSES: CanvasCourse[] = [
  {
    id: 101,
    name: 'ENVD 4365: Environmental Design Studio',
    course_code: 'ENVD 4365',
    enrollment_term_id: 202607,
    color: '#007A87', // Teal
    term: {
      id: 202607,
      name: 'Fall 2026',
      start_at: '2026-08-24T06:00:00Z',
      end_at: '2026-12-11T23:59:59Z'
    },
    is_favorite: true
  },
  {
    id: 102,
    name: 'THTR 3055: Lighting Design 1',
    course_code: 'THTR 3055',
    enrollment_term_id: 202607,
    color: '#CFB87C', // CU Gold
    term: {
      id: 202607,
      name: 'Fall 2026',
      start_at: '2026-08-24T06:00:00Z',
      end_at: '2026-12-11T23:59:59Z'
    },
    is_favorite: true
  },
  {
    id: 103,
    name: 'ATLS 4519: Learn, Build, Vibe',
    course_code: 'ATLS 4519',
    enrollment_term_id: 202607,
    color: '#8E44AD', // Purple
    term: {
      id: 202607,
      name: 'Fall 2026',
      start_at: '2026-08-24T06:00:00Z',
      end_at: '2026-12-11T23:59:59Z'
    },
    is_favorite: true
  }
];

export const MOCK_ITEMS: GradedItem[] = [
  // --- This Week / Urgent Items ---
  {
    id: 'mock-1',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Studio Cycle 05: Interactive Prototype & Reflection',
    type: 'assignment',
    dueDate: '2026-10-04',
    dueTime: '23:59',
    points: 10,
    weight: 5,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'canvas',
    sourceDoc: 'Canvas Live API',
    notes: 'Artifact (4pts), Reflection (3pts), Studio Share (3pts). Due Sunday before Monday class.',
    completed: false
  },
  {
    id: 'mock-2',
    courseId: '102',
    courseName: 'THTR 3055: Lighting Design 1',
    courseColor: '#CFB87C',
    title: 'Lighting Plot 2: Instrument Schedule & Channel Hookup',
    type: 'project',
    dueDate: '2026-10-06',
    dueTime: '17:00',
    points: 50,
    weight: 10,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'THTR 3055 Weekly Sched 08_20_2026.pdf',
    notes: 'Hardcopy plot due in theatre studio, digital PDF upload to Canvas.',
    completed: false
  },
  {
    id: 'mock-3',
    courseId: '101',
    courseName: 'ENVD 4365: Environmental Design Studio',
    courseColor: '#007A87',
    title: 'Site Analysis & Climate Model Drawing Board',
    type: 'assignment',
    dueDate: '2026-10-05',
    dueTime: '10:00',
    points: 25,
    weight: 5,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'canvas',
    sourceDoc: 'Canvas Live API',
    notes: 'Pin-up at start of studio at 10:00 AM.',
    completed: false
  },

  // --- On the Horizon (Pinned high-importance / exams / final projects) ---
  {
    id: 'mock-4',
    courseId: '102',
    courseName: 'THTR 3055: Lighting Design 1',
    courseColor: '#CFB87C',
    title: 'Midterm Practical Exam: Light Lab Focus & Cueing',
    type: 'exam',
    dueDate: '2026-10-22',
    dueTime: '14:00',
    points: 100,
    weight: 20,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'canvas',
    sourceDoc: 'Canvas Live API',
    confidence: 0.95,
    notes: 'In-person practical in Loft Theatre. 30 minute dedicated cueing block.',
    completed: false,
    hasConflict: true,
    conflictDetails: {
      field: 'Location',
      canvasValue: 'Loft Theatre',
      syllabusValue: 'Studio 105'
    }
  },
  {
    id: 'mock-5',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Final Project Culminating Showcase Demo',
    type: 'presentation',
    dueDate: '2026-11-30',
    dueTime: '18:00',
    points: 100,
    weight: 30,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'learnvibebuild Syllabus.rtf',
    notes: 'Showcase night 1. 10 demos per night, 5-7 min presentation of final artifact.',
    completed: false
  },
  {
    id: 'mock-6',
    courseId: '101',
    courseName: 'ENVD 4365: Environmental Design Studio',
    courseColor: '#007A87',
    title: 'Final Studio Capstone: Community Pavilion Masterplan',
    type: 'project',
    dueDate: '2026-12-04',
    dueTime: '17:00',
    points: 200,
    weight: 35,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'F2026_ENVD 4365 Syllabus.pdf',
    notes: 'Final physical model, 3 boards, digital portfolio book.',
    completed: false
  },

  // --- Later Items & Inferred Recurring ---
  {
    id: 'mock-7',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Studio Cycle 06: Machine Collaboration Artifact',
    type: 'assignment',
    dueDate: '2026-10-11',
    dueTime: '23:59',
    points: 10,
    weight: 5,
    isTBD: false,
    isUndated: false,
    isInferred: true,
    source: 'syllabus',
    sourceDoc: 'learnvibebuild Syllabus.rtf',
    notes: 'Expanded from weekly Sunday rhythm. Topic: Co-creative generative workflows.',
    completed: false
  },
  {
    id: 'mock-8',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Final Project Proposal & Brief',
    type: 'project',
    dueDate: '2026-11-09',
    dueTime: '23:59',
    points: 30,
    weight: 5,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'learnvibebuild Syllabus.rtf',
    notes: 'Proposal outline + tech stack or medium selection.',
    completed: false
  },
  {
    id: 'mock-9',
    courseId: '102',
    courseName: 'THTR 3055: Lighting Design 1',
    courseColor: '#CFB87C',
    title: 'Dance Concert Production Cue Sheet & Plot',
    type: 'assignment',
    dueDate: '2026-11-12',
    dueTime: '17:00',
    points: 40,
    weight: 8,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'canvas',
    sourceDoc: 'Canvas Live API',
    completed: false
  },

  // --- TBD / Undated / Special Items ---
  {
    id: 'mock-10',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Final Learning Reflection (Baseline Comparison)',
    type: 'assignment',
    dueDate: null,
    dueTime: null,
    points: 20,
    weight: 5,
    isTBD: true,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'learnvibebuild Syllabus.rtf',
    notes: 'Due during Exam Week (dates Dec 7-11). Exact date depends on official exam schedule.',
    completed: false
  },
  {
    id: 'mock-11',
    courseId: '102',
    courseName: 'THTR 3055: Lighting Design 1',
    courseColor: '#CFB87C',
    title: 'Attend 2 Live CU Theatre Productions & Written Critiques',
    type: 'reading',
    dueDate: null,
    dueTime: null,
    points: 30,
    weight: 6,
    isTBD: false,
    isUndated: true,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'THTR 3055_Lighting Design 1_Spencer_Fall 2026 08_19_26.pdf',
    notes: 'Attend university mainstage shows anytime before Dec 1. Submit 2-page critique within 7 days of performance.',
    completed: false
  },
  {
    id: 'mock-12',
    courseId: '101',
    courseName: 'ENVD 4365: Environmental Design Studio',
    courseColor: '#007A87',
    title: 'Guest Lecture: Sustainable Urbanism in Colorado Front Range',
    type: 'extra_credit',
    dueDate: '2026-10-15',
    dueTime: '18:30',
    points: 15,
    weight: null,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'syllabus',
    sourceDoc: 'F2026_ENVD 4365 Syllabus.pdf',
    notes: 'Extra credit lecture series in CINC. 1-page summary for up to 15 bonus points.',
    completed: false
  },

  // --- Completed Item ---
  {
    id: 'mock-13',
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    title: 'Week 1 Intention Baseline & Setup',
    type: 'assignment',
    dueDate: '2026-08-30',
    dueTime: '23:59',
    points: 10,
    weight: 2,
    isTBD: false,
    isUndated: false,
    isInferred: false,
    source: 'canvas',
    sourceDoc: 'Canvas Live API',
    notes: 'Three paragraphs reflecting on current AI relationship & course intentions.',
    completed: true,
    submittedAt: '2026-08-29T21:40:00Z'
  }
];

export const MOCK_SCAN_STATUSES: CourseScanStatus[] = [
  {
    courseId: '101',
    courseName: 'ENVD 4365: Environmental Design Studio',
    status: 'success',
    message: 'Scanned 1 syllabus PDF, 8 Canvas assignments',
    docsFound: 1,
    itemsExtracted: 9,
    lastScanned: '2026-09-30T16:45:00Z'
  },
  {
    courseId: '102',
    courseName: 'THTR 3055: Lighting Design 1',
    courseColor: '#CFB87C',
    status: 'partial',
    message: 'Conflict detected: Midterm Exam location',
    docsFound: 2,
    itemsExtracted: 14,
    lastScanned: '2026-09-30T16:45:00Z'
  },
  {
    courseId: '103',
    courseName: 'ATLS 4519: Learn, Build, Vibe',
    courseColor: '#8E44AD',
    status: 'success',
    message: 'Scanned syllabus page & expanded 14 weekly rhythms',
    docsFound: 1,
    itemsExtracted: 18,
    lastScanned: '2026-09-30T16:45:00Z'
  }
];
