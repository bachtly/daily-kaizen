# Plan your day: design

Status: proposed · Issue: #128 · Date: 2026-11-27

## Context and scope

Today daily-kaizen only records what happened (see [logging](../features/logging.md)). The owner wants to also plan each working day (Mon–Fri, Saturday optional) as time blocks ("09:00–11:00 Deep work on design doc"), and get a push a few minutes before each block starts.

In scope: a weekly plan (one per weekday), changes for one date, a heads-up push, and showing the plan next to what was logged. Out of scope: calendar sync, tasks or to-dos, and AI scheduling.

## Goals and non-goals

Goals
- Make a plan for a weekday once and have it repeat every week. Change one date without touching the rest.
- Get a heads-up push N minutes before each planned block.
- See plan and log on the same day, so the kaizen loop can later compare them.

Non-goals
- Plan vs actual numbers on the Week page. The data allows it; that's a follow-up issue.
- Google or Apple calendar import/export.
- Drag to move blocks. Blocks are edited in a sheet, like Entries.

## Requirements

| R | Requirement | Acceptance criteria |
|---|---|---|
| R1 | A **Plan block** has text, a start and an end (local wall-clock time, same day) and belongs to a weekday (**Every Monday**) or one date (**Only Mon 30 Nov**). | AC1 Saving an empty text, or an end not after the start, is refused on the wrong field. AC2 A block for every Monday shows on each Monday from now on. |
| R2 | A date's **Day plan** is its weekday's blocks, minus the ones skipped on that date, plus that date's own blocks. | AC3 "Only this day" edit on a weekly block changes that date and leaves the next Monday as it was. AC4 "Delete, only this day" hides the block on that date only. |
| R3 | **Plan days** in Settings: Mon–Fri on by default, Saturday and Sunday off, each can be turned on. | AC5 Only Plan days show in the Week plan. A block is never offered for a day that is off. |
| R4 | A **Heads-up** push N minutes before each block of today's Day plan. N is Off, 5, 10 (default), 15 or 30, set in Settings. | AC6 With N = 10, a block at 09:00 sends one push between 08:50 and 08:51 local time. AC7 Never a second push for the same block and date. AC8 A block added later than its heads-up time gets no push. AC9 Off sends nothing. |
| R5 | The push says what and when ("09:00–11:00 Design doc · in 10 min") and opens today's Day view. | AC10 Tapping it opens `/`. |
| R6 | The Day view shows today's and future days' plan (see UI, Q1). A planned block in the past with no Entry over it offers **Log as planned**. | AC11 Log as planned creates an Entry with the block's text and times in one tap. AC12 A future date in the week strip can be opened to plan but not to log. |
| R7 | Plan reads work offline (Local copy); plan writes need a connection, like Entries. | AC13 Offline, the plan shows and the edit buttons say "Needs a connection." |

Edge cases: overlapping blocks are allowed and listed in time order (no warning; a plan can be loose). A block can't cross midnight. Heads-ups respect the device time zone the app last reported (`settings.time_zone`), including DST days.

## Design

### Data model

New table `plan_blocks`:

| column | type | note |
|---|---|---|
| id | uuid pk | client-made, like Entries |
| user_id | uuid | default `auth.uid()`, RLS owner only |
| text | text | `btrim(text) <> ''` |
| starts | time | |
| ends | time | `ends > starts` |
| weekday | smallint null | ISO 1–7; set for weekly blocks |
| on_date | date null | set for one-date blocks |
| created_at | timestamptz | |

Check: exactly one of `weekday`, `on_date` is set.

New table `plan_skips (user_id, block_id → plan_blocks on delete cascade, on_date)`, primary key `(block_id, on_date)`: a weekly block hidden on one date.

`settings` gets `plan_weekdays smallint[] default '{1,2,3,4,5}'` and `heads_up_minutes smallint default 10` (check `in (0,5,10,15,30)`, 0 = Off).

`notification_kind` gets `'heads_up'`; `about = '<block id>/<YYYY-MM-DD>'`, so the existing `notifications_sent` primary key gives AC7.

### API

- Reads and simple writes are supabase-js on `plan_blocks` under RLS. Every `update()`/`delete()` is filtered by `id` (repo rule).
- RPC `edit_plan_block(p_id, p_date, p_text, p_starts, p_ends, p_scope)` with `p_scope` `'day' | 'every'`. For `'day'` on a weekly block it inserts the skip and a one-date copy in one transaction (AC3). RPC `delete_plan_block(p_id, p_date, p_scope)` does the same for deletes (AC4). Both are granted to `authenticated` only.
- Errors keep the repo's pattern of check names: `plan_text_empty`, `plan_end_not_after_start`, `plan_day_off`.

### UI

Mockups: Storybook `Mockups/128 Plan your day/*` (listed in the PR reply). Screens:

1. **Day plan**: today's blocks in time order. Past blocks that got an Entry fade; past ones without show Log as planned; the next block is marked "Next · in 25 min".
2. **Block sheet**: text, start, end, and for weekly blocks a choice "Only Mon 30 Nov / Every Monday" on save and on delete (Google Calendar's "this event / all events").
3. **Week plan**: Plan days as tabs (Mon–Fri, Sat if on), each with its blocks, and "Copy Monday to…" so a 5-day plan isn't typed five times.
4. **Empty**: "No plan for Monday" with Add block and Copy from another day.
5. **Settings → Plan**: Plan days and Heads-up (segmented Off/5/10/15/30).
6. Offline and loading states as on the Day view.

Open UI questions with one story per option (see Risks): Q1 where the plan lives, Q2 list or hour grid.

Accessibility: every block is a button with "Edit <text>, 09:00–11:00"; 44 pt targets; axe in light and dark before review (`app/src/ui/CLAUDE.md`).

### Backend

- `claim_due_notifications()` (latest in `supabase/migrations/20261109000000_nudge_gap.sql:12`) gets a third branch: for each user with a push subscription and a time zone, today's Day plan blocks where `start - heads_up_minutes <= local now < start`. Because the window ends at the block start, a block added after its heads-up time gets none (AC8).
- Heads-ups ignore Quiet hours: the owner planned the block, so it's wanted. (Open question Q4.)
- `send-notifications` builds the heads-up payload with the existing Declarative Web Push shape ([reminders](../features/reminders.md)); the link is `/`.
- The `notification-check` cron (`supabase/migrations/20261108000500_cron.sql:32`) moves from every 5 minutes to every minute, so a 5-minute heads-up isn't up to 5 minutes late. The claim is one indexed query; the function returns early when nothing is due.
- No feature flag: one user, and an empty plan sends nothing.

## Alternatives considered

- **Local scheduled notifications** (Notification Triggers, `showTrigger`): would work offline, but Chrome ended development and Safari never shipped it. Rejected; server push works on iPhone and Android.
- **Per-date plans only** (plan every morning, nothing repeats): simplest model, but the owner's working days repeat, so typing the plan 5 times a week is waste. Kept as "Only this day".
- **Weekly template only**: no way to move one meeting on one date. Rejected.
- **Calendar sync** (write blocks to Google Calendar and let it alert): needs OAuth and an external account; the app's own push already works. Rejected for now.
- **Recurrence rules (RRULE)**: far more than "this weekday" needs. Rejected.

## Research

- *How do existing planners work?* Structured: one visual timeline per day mixing tasks, events and routines, with recurring routines and per-task alerts; users ask for a default "15 min before" alert ([App Store](https://apps.apple.com/app/structured-daily-planner/id1499198946)). Tiimo: visual, colour-coded day plan, day/week views ([tiimoapp.com](https://www.tiimoapp.com/product/visual-planner)). Sunsama: a guided daily planning ritual; Akiflow and Motion: time blocking with AI scheduling; Google Calendar: free manual time blocking ([Morgen comparison](https://www.morgen.so/blog-posts/time-blocking-app), [Sunsama vs Akiflow](https://www.morgen.so/blog-posts/sunsama-vs-akiflow)). → Choice: a repeating weekday plan with one-date changes and a default lead time, no AI scheduling.
- *Best UI for a day plan?* The pattern across Structured, Tiimo and calendars is a vertical timeline of the day in time order; calendars use an hour grid. → Both built as options (Q2).
- *Can a PWA schedule a local notification?* Notification Triggers ended development, Chrome only ([Chrome docs](https://developer.chrome.com/docs/web-platform/notification-triggers)). iPhone home-screen apps get standard Web Push since iOS 16.4 ([MagicBell guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)). → Server-sent push from the existing job.

Queries: "time blocking day planner app comparison", "Structured app timeline UI daily planner reminders", "web push scheduled iOS PWA Notification Triggers status", "daily routine planner weekday template".

## Cross-cutting concerns

- Security: RLS owner-only on both tables; RPCs `security definer` with `search_path=''` and an owner check; pgTAP tests run as `authenticated`.
- Privacy: block text goes into the push payload, i.e. through Apple or Google push servers, encrypted (as Nudges do today). It is not sent to the AI.
- Observability: heads-ups are rows in `notifications_sent`, readable from the SQL editor.
- Cost: 1,440 cron calls a day instead of 288; well inside the Edge Function free quota.

## Tests

| Test | Covers |
|---|---|
| pgTAP: checks on `plan_blocks`, RLS as `authenticated` | AC1, AC5 |
| pgTAP: Day plan for a date (weekly, skip, one-date) | AC2, AC3, AC4 |
| pgTAP: `claim_due_notifications(p_now)` at 08:49, 08:50, 08:59, 09:00; second call; Off; late add; DST day | AC6–AC9 |
| Deno: heads-up payload title, body, link | AC10 |
| Vitest: Day plan merge, Log as planned builds the right Entry, writes filtered by `id` | AC3, AC11 |
| Vitest + stories: block sheet validation, scope choice, offline state | AC1, AC12, AC13 |

## Risks and open questions

1. **Q1 Where does the plan live?** Option A: in the Day view, planned blocks between Entries. Option B: its own Plan tab. *Recommended: A.* One screen for the day, and Log as planned is one tap away.
2. **Q2 List or hour grid?** Option A: an agenda list. Option B: a calendar-style hour grid. *Recommended: A.* It matches the Day view rows, works at 390 pt wide, and short blocks stay readable.
3. **Q3 Repeating weekly plan with one-date changes, or a fresh plan each day?** *Recommended: weekly plan + "Only this day".*
4. **Q4 Do heads-ups respect Quiet hours?** *Recommended: no.* A block planned at 07:00 inside quiet hours (23:00–07:00) should still alert at 06:50.
5. Risk: iPhone drops push subscriptions now and then (known WebKit issue). Mitigation: the subscription is already re-sent on every open (`app/src/routes.tsx:27`).
6. Risk: the time zone is stale after travel until the app is opened. Accepted; same as Nudges.
7. Pre-mortem "unused after a month": planning 5 days by hand is tedious. Mitigation: weekly plan plus Copy to….

## Decisions

| # | decision | alternative | reason |
|---|---|---|---|
| D1 | Weekday plan + one-date blocks + skips | per-date only; RRULE | repeats without retyping, simple model |
| D2 | Server push from `claim_due_notifications` | Notification Triggers | Triggers ended, no Safari |
| D3 | Cron every minute | every 5 min | heads-up on time |
| D4 | Default heads-up 10 min, choices Off/5/10/15/30 | per-block lead time | one setting; Structured users ask for a default |
| D5 | Plan days setting, Mon–Fri default | always 7 days | matches the request ("Saturday optional") |
