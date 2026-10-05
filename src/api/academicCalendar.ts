export interface AcademicTerm {
  termName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  classesStartDate: string;
  classesEndDate: string;
  finalsStartDate: string;
  finalsEndDate: string;
  holidays: { date: string; name: string }[];
}

export const CU_BOULDER_FALL_2026: AcademicTerm = {
  termName: 'Fall 2026',
  startDate: '2026-08-24',
  endDate: '2026-12-11',
  classesStartDate: '2026-08-24',
  classesEndDate: '2026-12-04',
  finalsStartDate: '2026-12-07',
  finalsEndDate: '2026-12-11',
  holidays: [
    { date: '2026-09-07', name: 'Labor Day (No classes)' },
    { date: '2026-10-08', name: 'Fall Reading Day (No graded work)' },
    { date: '2026-11-23', name: 'Fall Break' },
    { date: '2026-11-24', name: 'Fall Break' },
    { date: '2026-11-25', name: 'Fall Break' },
    { date: '2026-11-26', name: 'Thanksgiving Day' },
    { date: '2026-11-27', name: 'Fall Break' }
  ]
};

export const CU_BOULDER_SPRING_2027: AcademicTerm = {
  termName: 'Spring 2027',
  startDate: '2027-01-11',
  endDate: '2027-05-06',
  classesStartDate: '2027-01-11',
  classesEndDate: '2027-04-29',
  finalsStartDate: '2027-05-01',
  finalsEndDate: '2027-05-06',
  holidays: [
    { date: '2027-01-18', name: 'Martin Luther King Jr. Day' },
    { date: '2027-03-22', name: 'Spring Break' },
    { date: '2027-03-23', name: 'Spring Break' },
    { date: '2027-03-24', name: 'Spring Break' },
    { date: '2027-03-25', name: 'Spring Break' },
    { date: '2027-03-26', name: 'Spring Break' }
  ]
};
