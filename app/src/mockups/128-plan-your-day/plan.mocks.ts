// Mock data for the #128 Plan your day mockups. Today is Monday 30 Nov 2026, 10:35.

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type PlanBlock = {
  id: string;
  text: string;
  start: string; // HH:MM
  end: string;
  /** Every <weekday>, or only this one date. */
  repeats: 'weekly' | 'date';
};

export type LoggedEntry = { id: string; text: string; start: string; end: string; category: 'Deep' | 'Shallow' | 'Recovery' | 'Maintenance' | 'Waste' };

export const NOW = '10:35';
export const TODAY_LABEL = 'Mon 30 Nov';

export const mondayPlan: PlanBlock[] = [
  { id: 'p1', text: 'Email and chat', start: '08:00', end: '09:00', repeats: 'weekly' },
  { id: 'p2', text: 'Design doc', start: '09:00', end: '10:30', repeats: 'weekly' },
  { id: 'p3', text: 'Standup', start: '10:45', end: '11:00', repeats: 'weekly' },
  { id: 'p4', text: 'Code review', start: '11:00', end: '12:30', repeats: 'weekly' },
  { id: 'p5', text: 'Lunch walk', start: '12:30', end: '13:30', repeats: 'weekly' },
  { id: 'p6', text: 'Dentist', start: '14:00', end: '15:00', repeats: 'date' },
  { id: 'p7', text: 'Deep work: feature', start: '15:00', end: '17:00', repeats: 'weekly' },
  { id: 'p8', text: 'Plan tomorrow', start: '17:00', end: '17:15', repeats: 'weekly' },
];

export const tuesdayPlan: PlanBlock[] = [
  { id: 't1', text: 'Gym', start: '07:00', end: '08:00', repeats: 'weekly' },
  { id: 't2', text: 'Email and chat', start: '08:30', end: '09:00', repeats: 'weekly' },
  { id: 't3', text: 'Deep work: feature', start: '09:00', end: '12:00', repeats: 'weekly' },
  { id: 't4', text: 'Lunch', start: '12:00', end: '13:00', repeats: 'weekly' },
  { id: 't5', text: '1:1 with lead', start: '13:00', end: '13:30', repeats: 'weekly' },
];

/** What was logged this morning: the Email block happened, the Design doc block didn't. */
export const loggedToday: LoggedEntry[] = [
  { id: 'e1', text: 'Email triage', start: '08:00', end: '08:50', category: 'Shallow' },
  { id: 'e2', text: 'Scrolled news', start: '08:50', end: '09:20', category: 'Waste' },
];

export const planDays: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const allDays: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekDates: Record<Weekday, number> = { Mon: 30, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
