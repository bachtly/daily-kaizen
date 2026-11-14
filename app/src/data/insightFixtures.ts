// Sample insight cards for tests and stories (#80).
import type { InsightRow } from './db';

/** An insight card with sensible defaults. */
export const card = (id: string, week: string, extra: Partial<InsightRow> = {}): InsightRow => ({
  id, week_start: week, kind: 'waste_window', subject_key: '', rank: 1, facts: {}, entry_ids: [],
  finding: `Finding ${id}`, detail: 'Detail', try_this: `If it's 21:00, then I do ${id}.`, text_source: 'template',
  may_not_apply: null,
  evidence: { label: 'If-then plans · 21 studies', source: 'Wang 2021', shows: 'Shows', limits: 'Limits', url: 'https://example.org' },
  status: 'new', dismiss_reason: null, acted_at: null, active_until: null, result: null, generated_at: '2026-11-08T11:00:00Z',
  ...extra,
});
