# Feedback on 02-requirements.md, round 2

## User decisions
- Weeks: the This week page defaults to the current week (Monday 00:00 up to now) and lets me browse earlier weeks, like a calendar. "Review done" records the week being shown, so a Monday review of last week works.
- End times: an end time must not be later than now, with a few minutes' tolerance. Totals only count past time.
- Overlaps: overlapping time counts once, for the Entry created last. The user says this is a rare edge case: keep it to one line, no extra rules.
- Empty start default: start of today.
- General guidance from the user: "take it easy" on edge cases. Prefer the simplest rule that works for one user; don't add machinery for rare cases.

## Critic findings (APPROVE WITH CHANGES), all accepted, kept simple
- AC-2.3: each Outbox item (create, edit or delete) has its own ID and is applied once by that ID; an Entry's items are applied in the order made on the phone; a deleted Entry is never recreated by a late create. The api stage owns the mechanism.
- AC-3.1: editing the text of an Entry whose Tag source is AI clears the Tag, so it becomes Untagged and the Tagging check retries it.
- AC-2.5: I can edit and resend, or discard, a Rejected change; it counts in the Outbox count.
- Shorten: about 30% over the length guide. Keep each rule once, in its AC; UC exceptions refer to the AC; don't define actors twice.
- Suggestions: add an edit/delete branch to the UC-1 flowchart; mark NFR-1's 9-of-10 as (judgement) and name the measurement (open and save timestamps); AC-6.3: changing Quiet hours offline says a connection is needed.

## Consistency issues, all accepted
- "Rejected" Suggested category state: add to Glossary proposals, and note that docs/mvp-design.md's category status needs a third value.
- Unlogged: keep the brief's meaning; say the This week page counts Unlogged as elapsed time not covered by any Synced entry, as a page rule, and add a Glossary proposal only if needed.
- NFR-4 vs ADR 0003: make the target achievable, for example 95% tagged within 30 minutes, or within 15 minutes when the first call succeeds.
- Open questions: add the Resend sending domain (backend), the push sender library (backend, device test), Dexie and Cloudflare Pages on iOS (backend, device test), and pg_cron running in UTC with times converted from my time zone (backend).
- G1: add how a "day with entries" is counted: a day in my time zone with at least one Synced entry starting that day (judgement).
