# Plans (goal-linked if-then notifications): design

Status: proposed · Issue: #126 · Date: 2026-11-27

## Context and scope

The app finds Waste (Insights, [insights.md](../features/insights.md)) but nothing reminds me to act on it at the moment it happens. Right now the only pushes are the Nudge and the Review reminder ([reminders.md](../features/reminders.md)), and #74 and #80 decided on "no new notifications". This feature reverses that on purpose. It adds **Plans**: my own if-then rules ("After Lunch, go for a 10 min walk instead of scrolling") that the app sends as a push at the right moment. Each push names a goal and the time it saves.

In scope: creating Plans with AI help, smart timing from my log, the push, a check-in, and a weekly result. Out of scope: screen-time blocking, sensors or location, and shared Plans.

## Goals and non-goals

Goals: turn an insight into a cue at the moment of choice; fire "after X" even when X is logged late; show what the Plan is for and what it saves; keep the push volume low enough that I don't tune it out.

Non-goals: a habit tracker with streaks or scores (week-review rule: "never judges me"), and AI deciding when to send in real time.

## Requirements

- **R1 Plan.** A Plan is a **Trigger**, a **Do** (what I'll do, up to 80 chars), what it is **Instead of** (a Category or Activity, default Waste), a **Goal** and 1–3 **Messages**.
  - AC1: a Plan can't be saved without a Trigger, a Do and a Goal.
  - AC2: at most 5 active Plans.
- **R2 AI draft.** I describe the Plan in plain words. The AI fills every field, using my existing Activity names, and writes 3 Messages. I can edit anything.
  - AC3: a draft that names an unknown Activity, has a Message over 120 chars, or has a number that wasn't in the data it was given is rejected. A template draft takes its place.
  - AC4: the draft call sends only Activity and Category names and the text I typed, never Entry text.
- **R3 Triggers.** *At a time*: chosen days plus a time. *After an Activity* (or Category): plus a delay of 0–60 min.
  - AC5: a time Trigger fires within the 5-min job interval.
- **R4 Smart "after".** For an After Trigger, the app fires when the Trigger Activity is **logged as ended**, or when it is **predicted ended** (see Backend).
  - AC6: with Lunch logged ending 12:40 and a 10-min delay, the Plan fires at the first check at or after 12:50.
  - AC7: if Lunch ended on 18 of 20 recent weekdays by 12:55 and nothing logged today contradicts it, the Plan fires at the first check after 12:55 + delay, without a log.
  - AC8: if today's log already covers 12:00–14:00 with other Activities, the prediction moves past that block or skips the day. It never fires inside time I logged as something else.
  - AC9: if Lunch shows up on fewer than 60% of recent days of the same kind (weekday or weekend), the Plan doesn't predict and fires only on a log.
- **R5 Limits.** At most one push per Plan per day and 3 Plan pushes a day in total. Quiet hours hold, as for the Nudge. A Plan whose push is opened late is not re-sent.
  - AC10: a 4th Plan due on the same day is skipped and recorded as `capped`.
  - AC11: 5 pushes in a row with no check-in pause the Plan, and the Plans list asks "Still useful?".
- **R6 Goal and time saved.** The Goal is one of: an Activity weekly target (#74), this week's change, or a one-line Benefit. **Saves** is the average minutes of the Instead-of Category/Activity in the 60 min after the Trigger, over the last 4 weeks. Code computes it.
  - AC12: with fewer than 5 days of history, Saves shows "not enough history yet", with no number.
  - AC13: the push body contains the Goal and the Saves number, e.g. "≈25 min of Waste · toward Side project 5 h".
- **R7 Check-in.** Tapping the push opens a sheet with **Did it**, **Not today** and **Too early**.
  - AC14: Too early moves that Plan's prediction 10 min later (capped at +60). Did it and Not today change nothing in the timing.
- **R8 Result.** The Week page shows each Plan's sent count, done count and measured Saves against the 4 weeks before it started.
  - AC15: the measured Saves uses the same 60-min window as R6.
- **R9 From an insight.** An insight's if-then suggestion has **Make it a Plan**, which opens a prefilled draft.

## Design

### Data model

- `plans`: `id`, `user_id`, `do_text`, `trigger_kind` (`time` | `after`), `days` (bitmask), `at_time`, `after_activity_id` / `after_category_id`, `delay_min`, `instead_kind` and `instead_id`, `goal_kind` (`target` | `change` | `benefit`), `goal_ref`, `benefit`, `messages text[]` (1–3), `shift_min` (R7), `status` (`active` | `paused` | `stopped`), timestamps. RLS is owner-only. Check constraints cover AC1, AC2 (via a trigger) and the lengths.
- `plan_sends`: `plan_id`, `user_id`, `local_date`, `sent_at`, `reason` (`time` | `logged` | `predicted` | `capped` | `quiet`), `confidence`, `message_idx`, `response` (`done` | `not_today` | `too_early` | null). The PK on (`plan_id`, `local_date`) gives one send per day (R5), and the row is written before sending, like `notifications_sent` ([migration](../../supabase/migrations/20261108000400_notifications.sql)).

### API

- Plans are read and written with supabase-js under RLS. Every `update()` is filtered by `id`, and a test asserts it (CLAUDE.md).
- `draft-plan` edge function: `POST {text, from_insight_id?}` → `{draft}` or `{draft, template: true}`. Rate limit: one call per 10 s. Uses `claude-haiku-5-5`.
- RPC `plan_check_in(send_id, response)`.

### UI

Mockups: Storybook `Mockups/126 Plans/*`.

- **Plans list**: the active Plans, each with Trigger, Do, Goal, Saves and its last send. The empty state offers "Make one from an insight". A paused Plan shows "Still useful?" with Keep / Stop. Where the list lives is open question Q1.
- **Plan editor**: AI text box → draft → fields. A preview line explains the timing: "Usually Lunch ends ≈12:50 (18 of 20 weekdays)". The editor style is open question Q2.
- States: drafting (skeleton), AI failed (template draft plus a note), offline (read-only, as elsewhere), validation errors inline.
- **Push**: title = Do, body = Message plus the Goal and Saves line.
- **Check-in sheet**: the three buttons from R7.
- **Week page**: one "Plans this week" result card.
- Accessibility: 44-pt targets and AA contrast in light and dark (app/src/ui/CLAUDE.md).

### Backend

- `send-notifications` already runs every 5 min. It gains a Plan step: load active Plans and the last 8 weeks of Entries for users who have any Plans, compute what is due in TypeScript, claim by inserting into `plan_sends`, then push.
- **Prediction** (pure functions in `_shared/plans.ts`, unit-tested):
  1. Logged: an Entry today with the Trigger ended at E. The Plan is due at E + delay, unless the log came more than 60 min after E (too late to help).
  2. Otherwise, take the recent days of the same kind (up to 20 weekdays or 8 weekend days). For each, find the first end time of the Trigger. Drop days where that time falls inside a block I logged today as something else, and shift the rest past that block (AC8).
  3. Confidence = the share of those days whose end time is at or before now − delay − `shift_min`. Fire at confidence ≥ 0.7 when the Trigger appears on ≥ 60% of those days (AC9).
- Messages rotate one per send, to slow down habituation.
- Rollout: the step is behind a `PLANS_ENABLED` config value. An error in one Plan is logged and skipped, and the Nudge and Review reminder still go out.

## Alternatives considered

- **An AI decides every 5 min whether Lunch is done**: about 288 calls a day, results that differ between runs, and no clear "why". Rejected; the AI drafts and words, code decides (same split as Insights).
- **A trained receptivity or bandit model** (HeartSteps-style): needs many users, sensors and weeks of data, and this is a single-user app. Rejected for v1. The R7 Too early shift is the light adaptive part.
- **Fire only on a logged end** (Habitify-style "after habit X"): simple, but fails the issue's own case, because Lunch is logged late. Kept as the fallback when prediction isn't possible (AC9).
- **Fixed-time reminders only**: easy to build, but they miss the "after X" moment that if-then plans rely on.

## Research

- **Effective method** → if-then plans (implementation intentions), with the cue at the moment of choice. Meta-analysis d≈0.65 overall; newer domain-specific estimates are smaller (g≈0.31 for physical activity and for alcohol). Sources: [Gollwitzer & Sheeran via NCI](https://cancercontrol.cancer.gov/brp/research/constructs/implementation-intentions), [PMC8149892](https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892), [alcohol review 2022](https://eprints.whiterose.ac.uk/191494/3/Drug%20and%20Alcohol%20Review%20-%202022%20-%20Cooke%20-%20The%20effect%20of%20forming%20implementation%20intentions%20on%20alcohol%20consumption%20%20A.pdf).
- **Current apps** → three approaches. Habit stacking ([Habitify](https://intercom.help/habitify-app/en/articles/6113696-set-habit-stacking-reminders): "after habit X, immediately or after a wait"). Friction at the moment of use ([one sec, PNAS 2023 / CHI 2024](https://www.medien.ifi.lmu.de/pubdb/publications/pub/haliburton2024chi/haliburton2024chi.pdf): 57% fewer openings, rebound after breaks). And just-in-time adaptive interventions (JITAIs) in health research ([scoping review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11583291/)): promising, but the evidence is underpowered.
- **Common UI** → a sentence-style rule ("After [X], I will [Y]"), a trigger picker, and an immediate-or-delay choice (Habitify). Snippet-only for other apps.
- **AI for timing** → ML receptivity models gave up to 36% more receptivity than random timing, and the adaptive model improved over time ([Mishra et al.](https://arxiv.org/abs/2011.08302)). These models need sensor data, so v1 uses log statistics instead.
- **Fatigue** → responses to daily messages fell from 93% to 47% by week 8 ([JMIR 2020](https://mhealth.jmir.org/2020/4/e14270)), and a notification raises in-the-moment engagement 3.5× ([Drink Less MRT](https://mhealth.jmir.org/2023/1/e38342)). This motivates the caps (R5), auto-pause (AC11) and Message rotation.

## Cross-cutting concerns

- Privacy: no Entry text goes to the AI (AC4). Push bodies show on the lock screen, so Messages are mine and the Goal line is short.
- Cost: one Haiku call per draft. The prediction runs in code.
- Observability: `send-notifications` logs `plans_sent`, `plans_capped` and `plans_predicted`.

## Tests

- Unit tests (`_shared/plans.test.ts`, Deno): AC5–AC10, AC12, AC14, AC15.
- `draft-plan` validation: AC3, AC4.
- pgTAP: AC1, AC2, RLS, the `plan_sends` PK, and AC11 pause.
- Vitest: the editor (AC1, the AC12 copy), the push text (AC13), and the `update()` filter assert.
- Storybook stories for every screen state.

## Risks and open questions

- **Q1 Where do Plans live?** Recommended: Option A, a section on the Week page next to Insights (one less tab, and it sits where insights become Plans). Option B: a 4th tab "Plans".
- **Q2 Editor style?** Recommended: Option A, the sentence builder with an AI box on top. Option B: AI chat first. Option C: a step form.
- **Q3 Does this replace "one change for next week"?** Recommended: no. A Plan can point at the change as its Goal.
- **Q4 Push action buttons** (Did it right on the notification)? Recommended: not in v1, because the Declarative Web Push payload we use doesn't reliably support actions on iPhone. Tapping opens the check-in sheet instead.
- Risk: a wrong prediction annoys me → the 0.7 threshold, Too early, auto-pause, and the "why" line in the editor.
- Pre-mortem, "ignored after a month": fatigue → the caps, rotation and pause; and a Saves number nobody trusts → it comes from code and shows its basis.

## Decisions

| # | decision | alternative | reason |
|---|---|---|---|
| D1 | Code statistics predict the Trigger | an AI call per check, or an ML model | deterministic, cheap, explainable, enough data |
| D2 | The AI drafts the Plan and its Messages | a manual form only | the issue asks for AI help; same split as Insights |
| D3 | Saves is computed by code from the Instead-of window | the AI estimates it | numbers come from code (insights rule) |
| D4 | Caps: 1 per Plan and 3 in total per day, plus auto-pause | no caps | habituation evidence |
| D5 | Reverses "no new notifications" (#74, #80) | keep only the Review reminder | the issue's pain point: insights alone didn't change behaviour |
