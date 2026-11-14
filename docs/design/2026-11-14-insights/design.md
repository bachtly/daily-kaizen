# Insights (#80): data model and logic

Status: **draft for review**. UI: Storybook *Mockups / 80 Insights* (agreed). Evidence for each decision: [research.md](research.md) (`[S…]`).

## 1. What it does
- Once a week, before the Sunday review, the Server turns my Entries into **insights**: a finding from my own log, an if-then suggestion, and one hand-checked source. The Week page shows the top 3; **See more** lists the rest.
- **Make it next week's change** starts a small experiment. The next week shows whether it helped, measured against my usual weeks, not just last week.
- The AI **remembers my whole history**. Code keeps the facts (every week's numbers, every change and its result, every dismissal); the AI keeps a short **coach note** that it rewrites each week and I can read, edit or clear.
- **Code computes every number. The AI only words them**, picks a source from an allowed list, and may say a suggestion may not apply to me. Code checks its output before saving.

## 2. Pipeline
```
Entries ──facts.ts──▶ week_summaries (one row per week, all weeks)
                          │
            detectors (code) ──▶ candidates with numbers, Entry ids, metric, allowed sources
                          │
               rank (code: hours at stake × what I accepted/dismissed × freshness)
                          │
   AI (one call per week): history + changes + dismissals + coach note + candidates
                          │            ──▶ wording, source pick, "may not apply", new coach note
               validate (code: ids, sources, every number, lengths) ─fail─▶ template wording
                          │
                      insights rows ──▶ Week page cards
                          │
      accept ─▶ next week runs ─▶ Monday: evaluate vs usual weeks ─▶ result on the card, history for the AI
```

## 3. Data model
All tables: `user_id … default auth.uid() references auth.users on delete cascade`, RLS select own, writes by RPC or `service_role` only.

**`week_summaries`**: the long-term memory of numbers. One row per user-week.
| column | type | note |
|---|---|---|
| user_id, week_start | uuid, date | PK; week_start is a Monday |
| time_zone | text | zone the week was split in |
| as_of | timestamptz | end of the span covered (now, for the current week) |
| logged_days | smallint | D10 |
| facts | jsonb | `WeekFacts` (§4), versioned by `facts.v` |
| computed_at | timestamptz | |

**`insights`**: one row per candidate the AI saw, shown or not.
| column | type | note |
|---|---|---|
| id | uuid | |
| week_start | date | the week it is about |
| kind | text | detector id (§5) |
| subject_key | text | `''`, `activity:<id>` or `target:<id>`; with kind, it identifies "the same insight" across weeks |
| rank, score | smallint, real | §6 |
| facts | jsonb | the only numbers the card may show, with units |
| entry_ids | uuid[] | for *See N Entries* |
| metric | jsonb | how to measure it in any week: `{fn, args, better: 'lower'\|'higher'}` |
| finding, detail, try_this | text | ≤ 70 / 120 / 120 chars |
| text_source | text | `ai` or `template` |
| may_not_apply | text null | the AI's reason; the card sorts last and says so |
| evidence | jsonb | snapshot of the source entry (label, shows, against, limits, url) |
| status | enum `new`, `accepted`, `dismissed` | |
| acted_at | timestamptz null | |
| active_until | date null | accepted: the last Monday the change runs |
| result | jsonb null | `{baseline:[…], after:[…], verdict, evaluated_at}` (§8) |
| generated_at | timestamptz | |

Unique `(user_id, week_start, kind, subject_key)`; partial unique `(user_id, week_start) where status = 'accepted'`.

**`coach_notes`**: append-only versions; the latest row is current.
| id | body text (≤ 1200 chars, `''` = cleared) | source `tag_source` (`ai`/`me`) | week_start | created_at |

**`insight_runs`**: one row per generation attempt, for rate limits and debugging.
| id | week_start | trigger (`schedule`/`me`) | started_at, finished_at | status (`ok`, `too_early`, `ai_failed`, `template_only`) | model, input_tokens, output_tokens | error |

`weekly_reviews.next_change` (#74) stays free text; the Review done field is prefilled from the accepted card.

## 4. Facts (`supabase/functions/_shared/facts.ts`)
One pure TypeScript module, used by the Edge Function **and** the phone (D1). It takes over `ownedSegments` and the zone helpers from `app/src/data/week.ts`, so the Week totals, heatmap and insights can never disagree.

```ts
type WeekFacts = {
  v: 1; weekStart: string; asOf: string; tz: string;
  loggedDays: number;
  minutes: { byCategory: Record<Id, number>; untagged: number; unlogged: number };
  byActivity: Record<Id, { total: number; byCategory: Record<Id, number> }>;
  hours: { cat: Record<Id, number>; act: Record<Id, number>; switches: number }[]; // 168 = day*24 + hour
  nights: { date: string; sleepMin: number }[];
  deepBlocks: { start: string; min: number; activityIds: Id[]; next: 'waste' | 'other' | 'none' }[];
  shortEntries: Record<Id, { count: number; medianMin: number; days: number; nearDeep: number }>;
};
```
Definitions (one rule each):
- **Owned time**: the Week page's rules: past time only; overlapping time belongs to the Entry created last; an Entry's time is split equally among its Activities.
- **Hour cell**: minutes per Category and Activity in that local hour. A 25 h day adds both 01:00 hours together; a 23 h day leaves the missing hour empty. Its colour is the Category with the most minutes.
- **Switch**: two back-to-back pieces of owned time (gap ≤ 5 min) with a different Category or Activity set. It counts in the hour where the second piece starts. **Many switches** = 3 or more in an hour.
- **Deep block**: back-to-back Deep pieces with gaps ≤ 5 min. `next` is `waste` when a Waste piece starts within 15 min of its end.
- **Sleep**: a Recovery piece of 3 h or more that covers 02:00–05:00 local; it counts for the night it started.
- **Logged day**: a fully elapsed day with Unlogged ≤ 180 min (ATUS's rule [S21]).
- **Same-span rule**: comparing with earlier weeks uses the same span of each week (Monday 00:00 up to this week's `as_of` weekday and hour), read from `hours`. A Sunday-evening insight is therefore never compared with full weeks.
- **My usual**: the median and range of up to 8 earlier weeks with ≥ 5 logged days, over the same span. With fewer than 3 such weeks, no "usual" is shown.

## 5. Detectors (code, v1)
Each one returns at most one candidate a week (its biggest subject), with `facts`, `entry_ids`, `metric`, hours at stake and the source ids it may cite. Thresholds are named constants, tested at their edges.

| kind | fires when | hours at stake | metric (better) | allowed sources |
|---|---|---|---|---|
| `waste_window` | Waste ≥ 3 h, and one 3-hour window of the day (across all days) holds ≥ 50% of it. Subject: the Activity with ≥ 50% of that window, if any | Waste in the window | Waste in that window (lower) | If-then plans, Wang 2021 |
| `fragmented_deep` | ≥ 2 Many-switches hours containing Deep, and ≥ 4 Deep blocks under 20 min | Deep in blocks < 20 min | Deep minutes in blocks < 20 min (lower) | Attention residue, Leroy & Glomb 2018 |
| `focus_length` | ≥ 12 Deep blocks in the last 4 weeks; the best length band (< 30, 30–60, 60–90, 90–120, ≥ 120 min; ≥ 3 blocks each) is followed by Waste ≥ 30 points less often than the worst | Waste within 15 min after blocks in the worst band | share of Deep blocks followed by Waste (lower) | Break timing, Smits 2025 (mixed: shows *Against*) |
| `scattered_shallow` | one Activity has ≥ 10 Entries under 15 min on ≥ 4 days, ≥ 2 of them inside or next to Deep | minutes of those Entries | count of such Entries (lower) | Email batching, Kushlev & Dunn 2015 |
| `target_gap` | an #74 target missed by ≥ max(1 h, 20%): over, for a target narrowed to Waste; under, for any other | the gap | actual of that target (toward the target) | Progress monitoring, Harkin 2016 |
| `sleep_short` | ≥ 3 logged nights under 7 h | total shortfall below 7 h | nights under 7 h (lower) | Sleep duration, Watson 2015 |
| `late_work` | Deep or Shallow in the 2 h before my Quiet hours start, on ≥ 2 days | work minutes in that window | the same (lower) | Switching off, Wendsche 2017 |
| `squeezed_recovery` | Recovery other than sleep under 2 h on ≥ 3 logged days | shortfall below 2 h | days under 2 h (lower) | Free time, Sharif 2021 (*Against*: over 5 h of solo, unproductive time also hurts) |
| `maintenance_drift` | Maintenance ≥ 1.5× or ≤ 0.5× my usual, by ≥ 3 h | the difference | Maintenance minutes (toward my usual) | Reference only: ATUS 2024 average (*Limits*: an average, not a target) |

- Activity names come from the Activities table; a merged Activity reports under its target.
- The active change's `(kind, subject_key)` is not a candidate while it runs; its result card covers it.
- **Evidence library**: `supabase/functions/_shared/evidence.ts`, a typed list `{id, kinds, label, source, shows, against?, limits, url, checked_on}`. Each entry is checked against the paper by hand before it is merged. The insight row keeps a snapshot, so editing an entry later never rewrites old cards.

## 6. Ranking and adaptation (code)
`score = stake_minutes × w(kind) × fresh(kind, subject)`
- **w(kind)** = 2 × (a + 2) / (a + d + 4) over the last 26 weeks, where a = accepted + helped and d = dismissed + worse. It starts at 1.0 and moves slowly (a Beta(2,2) posterior mean, scaled to 0–2).
- **fresh**: 1.0 normally; 0.5 when the same `(kind, subject)` was shown in each of the last 2 weeks and I did nothing; paused for 4 weeks after 3 such weeks in a row (habituation [S33][S34]).
- **Dismissed** `(kind, subject)` is **not generated for 8 weeks**: a dismissal is an order, not a hint [S31][S32].
- Up to 8 candidates are kept, ordered by score; cards flagged *may not apply* go last. The page shows 3, then *See N more*.

## 7. The AI step
**Call**: `claude-opus-5-5`, effort `medium`, one Messages call per user-week, structured output (`output_config.format`, JSON schema), no tools, server-side refusal fallback on. About 6–10k tokens in and 1.5k out, so $0.06–0.10 a week (D8).

**Context** (built by code, oldest first, about 3k tokens per year of history):
1. `history`: one line per week for **all** weeks: logged days, hours per Category, median sleep, switches, the change that ran and its verdict. Weeks older than 2 years are folded into months.
2. `changes`: every past change: wording, kind, weeks run, usual → after, verdict.
3. `dismissed`: the last 26 weeks of `(kind, subject, week)`.
4. `coach_note`: the current note, and whether I wrote or edited it.
5. `targets`: #74 targets with this week's actuals.
6. `candidates`: id, kind, subject names, `facts`, Entry count, allowed sources (label, shows, limits).

No Entry text is sent, only Category and Activity names and numbers (D11).

**Instructions** (fixed system prompt): use only the numbers given; write `finding`, `detail` and `try_this` ("If …, then I …") within their lengths; tie a suggestion to what helped or failed before ("Last time the phone-outside plan cut it to 2h"); never repeat a plan that was tried and judged *worse*; pick a source only from the candidate's list; set `may_not_apply` with a reason taken from the history or my note; rewrite the coach note.

**Output schema**: `{cards: [{candidate_id, finding, detail, try_this, evidence_id, may_not_apply: string|null}], coach_note: string}`.

**Validation (code), per card**:
- `candidate_id` and `evidence_id` are from the candidate's lists.
- Every number in the text, after normalising units ("6h", "6 h", "360 min", "21:00", "9pm"), is in the candidate's `facts`, its names, or its source entry [S38].
- Lengths and the if-then shape are within limits.

A card that fails gets its **template wording** (one per kind, filled from `facts`) and `text_source = template`. A missing card gets a template too.

**Coach note rules** (§R1: the AI's memories spread errors, so add strictly):
- Rewritten from the old note, the history and this week's outcomes; never appended; at most 1200 characters.
- It may state a pattern only when ≥ 2 weeks of history or an explicit dismissal support it. Lines I wrote stay word for word.
- It passes the same number check against `history`. If it fails or the call fails, the old note stays. Every accepted version is a new row, so a bad note can be rolled back.

**Failure**: on an error, timeout or refusal, the cards come from templates, the note doesn't change, and the hourly check retries up to 3 times. A retry replaces template cards I haven't acted on.

## 8. Changes and results
- **Accept** (`accept_insight`): `status = accepted`, `active_until` = the Monday after the insight's week. It replaces any other accepted card of that week. The Review done field is prefilled with `try_this` (still editable, ≤ 140).
- **Keep it** on the next week's *Last week's change* card (`keep_change`): `active_until` moves on 7 days, so the experiment runs longer, as habits take weeks [S16].
- **Evaluate** at Monday 04:00 local, for each accepted insight whose run includes the week that just ended:
  - *after* = the metric in each full week of the run.
  - *baseline* = the metric in up to 4 weeks with ≥ 5 logged days, up to and including the insight's own week.
  - Verdict: **helped** when the median of *after* beats **every** baseline week; **worse** when it is worse than every baseline week; **unclear** otherwise; **too few weeks** with fewer than 3 baseline weeks [S14][S15]. Beating every week, rather than last week, keeps regression to the mean from counting as a win [S13].
- The card shows "Waste after 21:00: usual 5–7h → 2h · Helped". Verdicts feed `w(kind)` and the AI's `changes`.
- One accepted change a week: one if-then plan works, and several for the same goal did not [S17].

## 9. Schedule and API
- **Hourly cron** `insights-check` → Edge Function `insights` (job secret), per user with a time zone:
  - Sunday 18:00–18:59 local (an hour before the Review reminder): compute this week's summary; with ≥ 5 logged days, generate insights once.
  - Monday 04:00–04:59 local: recompute the last 9 weeks' summaries, which picks up backfills, then evaluate running changes.
  - Retry failed AI runs, up to 3.
- **On demand**, `POST /functions/v1/insights {week_start}` with my JWT: *Get insights now* (≥ 5 logged days, current or previous week) and *Update* (Entries changed since `generated_at`), at most once an hour. Cards I acted on stay.
- **RPCs** (`authenticated`, `security definer`, every write filtered by `user_id = auth.uid()`):
  - `accept_insight(p_id)`, `dismiss_insight(p_id)`, `undo_insight(p_id)` (back to `new`, for the Undo after dismiss).
  - `keep_change(p_id)`.
  - `set_coach_note(p_body)` (adds a `me` version; `''` clears it).
- **Phone reads** (Local copy): `insights` for the current and previous week, the last 9 `week_summaries`, the current `coach_notes`.

## 10. Phone
- **Heatmap**: computed on the phone with `facts.ts` from the week's Entries, as the Week totals are, so it works offline for the weeks the Local copy holds. The Activity chips use the same hour cells.
- **Trend**: one line per Category over 8 weeks, from `week_summaries` plus the live current week; the dashed line marks a change's start.
- **Cards**: from `insights`; *See N Entries* opens a sheet of those Entries (date, time, text). *Not useful* hides the card with "Hidden · Undo", held outside the list.
- **Settings → What the coach remembers**: the note, **Edit**, **Clear**, and when it last changed.

## 11. Rules (one each)
- No insights before 5 logged days in the week; the card says how many so far.
- At most 8 insights a week, one per kind; 3 shown, the rest under *See more*.
- Numbers on a card always come from code; a card whose AI wording fails a check uses its template.
- A source is always from the evidence library, never free text from the AI.
- *Not useful* hides that kind of insight for that subject for 8 weeks.
- One accepted change per week; accepting another replaces it.
- Results compare with my usual weeks, not with last week, and need 3 usual weeks.
- No new notifications; the Review reminder stays the only nudge.
- Everything except reading needs a connection, like Review done.

## 12. Decisions
- **D1 Facts in one shared TypeScript module** used by the phone and the Edge Function, in `supabase/functions/_shared/` (the safe place to import from [S41]).
  - Rejected: SQL views, which would duplicate the overlap, split and DST rules [S42].
  - Rejected: facts on the phone only, because the Sunday job runs without the phone.
  - Rejected: letting the AI compute numbers, because it hallucinated them [r1q03-10].
- **D2 One `week_summaries` row per week, facts as jsonb.**
  - Rejected: recomputing from Entries on every AI call (about 20k Entries after 2 years).
  - Rejected: a normalised hour table (168 rows a week that nothing queries).
- **D3 Fixed, hand-written detectors** with research thresholds and personal baselines.
  - Rejected: an AI that finds patterns freely; its numbers can't be checked, and a correlation is not a cause [S11].
  - Rejected: significance tests, with this few weeks.
- **D4 Memory = structured history from code + a short coach note the AI rewrites, versioned and editable by me** [S5][S7][S9].
  - Rejected: an AI that appends memories, because errors pile up [S3][S4].
  - Rejected: the full raw history in every prompt, because of context rot and cost [S8].
  - Rejected: vector retrieval; one user with little data, and summaries match retrieval [S5].
  - Rejected: Anthropic's memory tool; the files would live outside our database, harder to show, edit and test.
- **D5 The AI words cards, picks sources and may flag "may not apply"; code ranks and checks.** A flagged card stays visible, last, with its reason, since hiding data on a guess was rejected before.
  - Rejected: templates only, which can't use my history.
  - Rejected: an AI that ranks or drops cards, since ranking must stay testable.
- **D6 Results by non-overlap with ≥ 3 usual weeks**, over the same span; *Keep it* extends the run.
  - Rejected: before vs after one week (regression to the mean [S13]).
  - Rejected: t-tests (too few points).
  - Rejected for now: asking me "did it help?" (one more step; could add later).
- **D7 Adaptation = a slow per-kind weight + a hard 8-week hide on dismiss + a habituation pause.**
  - Rejected: Thompson sampling. Its randomness would confuse one person, and one decision a week is too few [S35].
  - Rejected: dismiss as a soft signal [S31][S32].
- **D8 Model `claude-opus-5-5`, effort `medium`**, about $0.06–0.10 a week [S43].
  - Rejected: Haiku 5.5. It is about 40× cheaper ($0.002) but weaker at reasoning over a long history; it stays the tagger. The model is one constant, so we can benchmark and switch.
- **D9 Generate Sunday 18:00 local, finalise and evaluate Monday 04:00**, plus on demand.
  - Rejected: daily insights (habituation [S33]).
  - Rejected: only after the week ends, which would miss the Sunday review.
- **D10 A logged day has ≤ 180 min Unlogged** (ATUS [S21]); insights and usual weeks need ≥ 5 logged days.
- **D11 No Entry text in the weekly call.** It is less data to send, and names and numbers are enough. Rejected: sending texts for richer wording.
- **D12 One accepted change a week** [S17], matching #74's one change.

## 13. Open questions
1. **Model**: Opus 5.5 (~$0.40/month) or Haiku 5.5 (~$0.01/month)? Recommendation: Opus 5.5, with a 4-week side-by-side on my real weeks before settling.
2. **Logged day**: if I don't log sleep every night, ≤ 180 min Unlogged may keep insights away. Alternative: count only Unlogged outside Quiet hours.
3. **Not useful with an optional reason** (one line, passed to the coach note)?
4. **Mockup wording**: the focus card said "ended on plan", but there is no plan data. It becomes "least often followed by Waste". The target card names the Activity target ("Company A · Deep: 6h of 10h").

## 14. Work (PRs, in order)
1. **db**: `week_summaries`, `insights`, `coach_notes`, `insight_runs`, RLS, RPCs, cron, pgTAP.
2. **refactor**: move `ownedSegments` and the zone helpers into `_shared/facts.ts`; the app imports them; the week tests pass unchanged.
3. **functions**: summaries, detectors, ranking, templates, evaluation (no AI); Deno tests per detector at threshold edges.
4. **functions**: the AI step, validation, coach note; tests with recorded replies, including bad numbers and bad source ids.
5. **app**: Local copy reads; heatmap and trend; cards with accept, dismiss/undo and keep; coach note in Settings; axe in light and dark; screenshots.
6. **docs**: `docs/features/insights.md`.
