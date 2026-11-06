# Feedback on 02-requirements.md, round 1

The user is editing 02-requirements.md themselves. This file records their decisions and the review findings to apply.

## User decisions
- Q1 Weekly review done: a "Review done" button on the This week page records that week's review. G1 counts these.
- Q2 Week span: Monday to Sunday in my time zone, up to now. Unlogged counts only time that has passed.
- Q3 Nudge: 3 hours after the end time of my latest Synced entry, outside Quiet hours. The roughly 07:00 Nudge after sleep is accepted.
- Q4 Edit and delete: allowed. Edited text is tagged again unless I set the Tag myself.
- Q5 Outbox UI: a small count of entries in the Outbox. No export.
- Q6 Starting Categories: README §Categories (Deep, Shallow, Maintenance, Waste, Recovery). Only the descriptions remain, owned by data-model.
- Overlaps: overlapping time counts once, for the entry saved last.
- ADR candidate, offline edits: edits and deletes of Entries queue in the Outbox; the latest change to my own fields wins; Tag corrections and Suggested category decisions need a connection.
- ADR candidate, tagging retry: a scheduled check every 15 minutes retries Untagged entries, and tagging is safe to repeat.

## Review findings to apply (critic verdict: REVISE)
Blocking: define Q1 to Q3 as testable ACs and add an Open questions section with owners; remove AC-5.4 as a standalone AC.
Issues: cite README for Categories; define the start-time default from the latest known end time stored on the phone, and the empty default; Sync and refresh form defaults on open or return to foreground; an Entry the Server rejects stops retrying and is shown to me; This week aggregation rules (overlap, midnight and week splits, up to now, which time zone); de-duplicate Suggested categories across Entries and remember rejections; report time zone (IANA name) and push subscription on every open; add Nudge and Sign in flows, a session-lost branch and an empty-history branch; ACs to enable push after a tap (with a denied branch) and to edit Quiet hours; NFR-5 backup marked unverified, retention reworded for deletes.
Suggestions: US-7 traces to G3 through Sync; split AC-2.1 and AC-7.1 to one behaviour each; glossary additions (Server-owned field, active Category, sweep, push subscription, Tag source); postconditions for UC-5 and UC-6; an availability NFR for the free-plan pause.
Consistency: Q-ids undefined; "feedback round 1" and "mvp-design §Push" references; terms "gap", "Draft", "Server"/"AI" actors; AC-5.1 Outbox entries counted as Untagged contradicts the definition; AC-4.2/4.3 move-on-approve and remove-on-reject are unmarked judgement; English entries and the push-fallback contingency untraced; logging-burden (research item 8) untraced.
