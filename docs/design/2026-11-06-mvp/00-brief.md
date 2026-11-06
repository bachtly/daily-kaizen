# daily-kaizen MVP: brief

## Problem

I don't have an honest picture of where my time goes during the day. Screen tracking misses
time away from devices, and the open-source tools reviewed in the README don't cover AI tagging
or a waste review. Evidence: my own experience and the README's prior-art review. How much time
is actually wasted is an assumption until there's data.

## Users and job

Me, the only user, on an iPhone · job: log what I did in seconds and see each week where my time went.

## Goals

- G1 Over 14 consecutive days, I log entries on at least 12 days and complete 2 weekly reviews.
- G2 Logging an entry takes under 15 seconds from opening the app, when online.
- G3 No saved Entry is ever lost. Logging, editing and deleting need a connection, so a saved Entry is always on the Server ([ADR 0004](adr/0004-require-a-connection-for-all-writes.md)).

## Non-goals

- Improvement experiments and AI suggestions (v1 in the README roadmap)
- Screen or app tracking
- Other users, team, client or billing features
- A to-do list or planner
- Precise timesheets: rough durations are fine

## Constraints

- **Stack:** keep the choices in [`docs/mvp-design.md`](../../mvp-design.md) (React + Vite,
  Cloudflare Pages, Supabase, Claude Haiku 5.5, Resend, Web Push) unless research finds a blocker.
- **Cost:** running costs stay under about $5 a month.
- **Maintenance:** Claude writes most of the code and I review it, so prefer well-documented,
  conventional approaches.
- **Device:** iPhone on iOS 18.4 or later (stated by me, 2026-11-06), used as a home-screen web app. Entries are written in English.
- **Deadline:** none.

## Area of the system

The repo has no code yet, so everything is new. These paths are proposals.

| Module / service | Path | Why it is touched |
|---|---|---|
| Phone web app | `app/` (proposed) | Logging, Local copy, weekly page, settings |
| Database schema | `supabase/migrations/` (proposed) | Entries, categories, push subscriptions, settings |
| Server functions | `supabase/functions/` (proposed) | Tagging, weekly email, push notifications |
| Existing docs | `README.md`, `docs/mvp-design.md` | Source of the goals and decisions; update if the design changes them |

## Stages

| Stage | Run / skip | Reason |
|---|---|---|
| research | Run | Verify the biggest risks: iPhone push, offline sync, how similar tools handle review |
| requirements | Run | Required |
| data-model | Run | New schema |
| api | Run | Write and tagging contracts need defining, even with Supabase's generated API |
| ui | Run | Logging speed (G2) depends on the screens |
| backend | Run | Scheduled jobs, tagging retries, secrets, deployment |
| design | Run | Required |

## Glossary

| Term | Meaning | Name in code (if it exists) |
|---|---|---|
| Entry | One logged activity: free text, start time, end time, category | None yet (`entries` proposed) |
| Category | A label for how time was spent, such as Deep or Waste | None yet (`categories` proposed) |
| Tag | The category assigned to an entry, by the AI or by me | None yet |
| Suggested category | A new category proposed by the AI, waiting for my approval | None yet |
| Untagged | An entry that has no category yet because tagging hasn't succeeded | None yet |
| Local copy | A read-only copy of this week's and last week's data on the phone, for viewing offline; refreshed when online | None yet |
| Weekly review | My Sunday session using the "This week" page | None yet |
| Unlogged | Time in a day not covered by any entry | None yet |
| Nudge | A push notification asking me to log, after 3 hours with no entry | None yet |
| Quiet hours | The daily period when nudges aren't sent | None yet |
| Review reminder | The Sunday 19:00 email and push asking me to do the Weekly review | None yet |
| Category suggestion | The push sent when the AI proposes a Suggested category | None yet |
| Server | Supabase: the database and server functions (see Actors in 02-requirements.md) | None yet |
| AI | Claude Haiku 5.5, called by the Server to choose a Tag (see Actors in 02-requirements.md) | None yet |
| Active Category | A Category available for tagging: a starting Category or an approved Suggested category | None yet |
| Rejected category | A Suggested category I rejected; it isn't suggested again | None yet |
| Tag source | Who set an Entry's Tag: AI or me | None yet |
| Server-owned field | A field only the Server writes, such as the Tag and Tag source; an edit from the phone never overwrites it | None yet |
| Tagging check | The 15-minute job that retries Untagged entries ([ADR 0003](adr/0003-retry-untagged-entries-with-a-scheduled-check.md)) | None yet |
| Push subscription | The phone's Web Push address the Server sends notifications to | None yet |
| Gap | The time since the latest end time of my saved Entries; a new or edited Entry with a later end time starts a new Gap | None yet |
| Review done | The record that a week's Weekly review is complete | None yet |
| Starting Category | One of the five Categories from README §Categories that my account starts with | None yet |
| This week page | The page showing a week's time per Category, defaulting to the current week, with earlier weeks browsable | None yet |
| Entry's Suggested category | The Suggested category the AI proposed for an Entry; approving it moves the Entry's Tag to it | None yet (`entries.suggested_category_id` proposed) |
