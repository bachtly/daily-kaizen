// Mock data for the UI mockups. Shapes follow docs/design/2026-11-06-mvp/03-data-model.md loosely.

export type Category = {
  id: string;
  name: string;
  description: string;
  colour: string;
  status: 'active' | 'suggested' | 'rejected';
};

export type Entry = {
  id: string;
  text: string;
  start: string; // HH:MM, local time
  end: string;
  day: string; // e.g. "Tue 4 Nov"
  categoryId: string | null;
  tagSource: 'ai' | 'me' | null;
  taggingGaveUp?: boolean;
  suggestedCategoryId?: string;
};

export const categories: Category[] = [
  { id: 'deep', name: 'Deep', description: 'Focused work that moves a hard goal forward', colour: 'var(--cat-deep)', status: 'active' },
  { id: 'shallow', name: 'Shallow', description: 'Email, chat, quick admin, routine meetings', colour: 'var(--cat-shallow)', status: 'active' },
  { id: 'maintenance', name: 'Maintenance', description: 'Cooking, cleaning, commuting, errands', colour: 'var(--cat-maintenance)', status: 'active' },
  { id: 'recovery', name: 'Recovery', description: 'Sleep, exercise, meals with friends, entertainment chosen on purpose', colour: 'var(--cat-recovery)', status: 'active' },
  { id: 'waste', name: 'Waste', description: 'Doomscrolling, aimless video, drifting between apps', colour: 'var(--cat-waste)', status: 'active' },
];

export const suggestedAdmin: Category = {
  id: 'admin', name: 'Admin', description: 'Forms, bills, paperwork', colour: 'var(--cat-new)', status: 'suggested',
};

export const entries: Entry[] = [
  { id: 'e1', day: 'Tue 4 Nov', start: '00:00', end: '07:10', text: 'Sleep', categoryId: 'recovery', tagSource: 'ai' },
  { id: 'e2', day: 'Tue 4 Nov', start: '07:10', end: '07:45', text: 'Breakfast and dishes', categoryId: 'maintenance', tagSource: 'ai' },
  { id: 'e3', day: 'Tue 4 Nov', start: '09:00', end: '10:30', text: 'Wrote design doc', categoryId: 'deep', tagSource: 'ai' },
  { id: 'e4', day: 'Tue 4 Nov', start: '10:30', end: '10:45', text: 'Standup', categoryId: null, tagSource: null },
  { id: 'e5', day: 'Tue 4 Nov', start: '11:00', end: '11:20', text: 'Tax form', categoryId: null, tagSource: null, taggingGaveUp: true, suggestedCategoryId: 'admin' },
  { id: 'e6', day: 'Tue 4 Nov', start: '12:30', end: '13:05', text: 'Scrolled reddit', categoryId: 'waste', tagSource: 'ai' },
  { id: 'e7', day: 'Wed 5 Nov', start: '08:30', end: '09:00', text: 'Commute', categoryId: 'maintenance', tagSource: 'ai' },
  { id: 'e8', day: 'Wed 5 Nov', start: '09:00', end: '09:40', text: 'Email triage', categoryId: 'shallow', tagSource: 'me' },
  { id: 'e9', day: 'Wed 5 Nov', start: '09:40', end: '10:52', text: 'Reading PR reviews', categoryId: 'deep', tagSource: 'ai' },
];

export type Total = { id: string; label: string; minutes: number; colour: string; neutral?: boolean };

export const totals: Total[] = [
  { id: 'deep', label: 'Deep', minutes: 750, colour: 'var(--cat-deep)' },
  { id: 'shallow', label: 'Shallow', minutes: 430, colour: 'var(--cat-shallow)' },
  { id: 'maintenance', label: 'Maintenance', minutes: 300, colour: 'var(--cat-maintenance)' },
  { id: 'recovery', label: 'Recovery', minutes: 920, colour: 'var(--cat-recovery)' },
  { id: 'waste', label: 'Waste', minutes: 125, colour: 'var(--cat-waste)' },
  { id: 'untagged', label: 'Untagged', minutes: 40, colour: 'var(--neutral-bar)', neutral: true },
  { id: 'unlogged', label: 'Unlogged', minutes: 1875, colour: 'var(--neutral-bar)', neutral: true },
];

export const recentTexts = ['Email triage', 'Lunch', 'Commute', 'Standup', 'Scrolled reddit'];

export function formatMinutes(m: number): string {
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
