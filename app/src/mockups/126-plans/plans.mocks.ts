/** Mock data for the #126 Plans mockups. Made-up names and numbers only. */

export type PlanStatus = 'active' | 'paused';

export interface MockPlan {
  id: string;
  /** "After Lunch + 10 min" or "Weekdays 21:00". */
  trigger: string;
  do: string;
  instead: string;
  goal: string;
  /** null = not enough history yet (AC12). */
  saves: string | null;
  /** Why the app thinks the trigger happened: shown under the Plan. */
  timing: string;
  last: string;
  status: PlanStatus;
}

export const plans: MockPlan[] = [
  {
    id: 'p1',
    trigger: 'After Lunch + 10 min',
    do: 'Go for a 10 min walk',
    instead: 'Waste',
    goal: 'Side project · 5 h a week',
    saves: '≈25 min of Waste a day · ≈2 h a week',
    timing: 'Usually Lunch ends ≈12:50 (18 of 20 weekdays). Fires on your log, or by 13:00 if you log later.',
    last: 'Today 13:02 · Did it',
    status: 'active',
  },
  {
    id: 'p2',
    trigger: 'Weekdays 21:00',
    do: 'Phone on the charger in the hall',
    instead: 'Game A',
    goal: 'Sleep 7 h+',
    saves: '≈40 min of Game A a night',
    timing: 'At a fixed time, Mon–Fri. Quiet hours start 23:00.',
    last: 'Yesterday 21:00 · Not today',
    status: 'active',
  },
  {
    id: 'p3',
    trigger: 'After Standup',
    do: 'Open the design doc before Slack',
    instead: 'Shallow',
    goal: 'Feel in control of my mornings',
    saves: null,
    timing: 'Standup is on 3 logged days so far: fires only when you log it.',
    last: 'Not sent yet',
    status: 'active',
  },
];

export const pausedPlan: MockPlan = {
  ...plans[1],
  status: 'paused',
  last: '5 pushes with no check-in',
};

export const draftText = 'after lunch I scroll reddit, I want to walk 10 min instead';

export const draft = {
  afterActivity: 'Lunch',
  delay: '10 min',
  do: 'Go for a 10 min walk',
  instead: 'Waste',
  goal: 'Side project · 5 h a week',
  messages: [
    'Lunch done? A 10 min walk keeps the afternoon for Side project.',
    'Shoes on, phone in pocket: 10 minutes outside.',
    'Walk first, then decide about reddit.',
  ],
  saves: '≈25 min of Waste a day · ≈2 h a week',
  timing: 'Usually Lunch ends ≈12:50 (18 of 20 weekdays).',
};

export const activities = ['Lunch', 'Standup', 'Company A', 'Side project', 'Game A', 'Dinner'];
export const categories = ['Waste', 'Shallow', 'Deep', 'Maintenance', 'Recovery'];
export const goals = ['Side project · 5 h a week', 'This week’s change: no phone at lunch', 'A benefit in my words…'];

export const weekResult = [
  { plan: 'After Lunch → walk', sent: 5, done: 4, saved: 'Waste after Lunch: usual 30–45 min → 12 min a day' },
  { plan: '21:00 → phone on the charger', sent: 5, done: 2, saved: 'Game A after 21:00: usual 50 min → 38 min a night' },
];
