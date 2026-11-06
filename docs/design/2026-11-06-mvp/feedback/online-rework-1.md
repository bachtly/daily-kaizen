# Feedback on the online-only rework (02-requirements.md, 03-data-model.md)

## User decisions
- Deliberate, enjoyed entertainment is Recovery; the same done aimlessly is Waste. Close OQ-A.
- The Gap clock runs from the latest end time of any Entry. With no Entries, there is no Gap and no Nudge. Deleting the latest Entry simply moves the Gap start back; one Nudge per Gap still applies. Close OQ-B.
- Apply all fixes below simply, then approve. Keep docs lean.

## Critic findings, accepted
1. Duplicate save: entries.id is a uuid the phone creates when the form opens; a create with an existing id changes nothing. Reword AC-2.2: a failed or unknown save keeps the form and is safe to save again. The api stage owns the mechanism.
2. Local copy holds Entries that end after the previous Monday 00:00 (so sleep crossing into Monday is included). Say it once in AC-2.3 and in the data model.
3. NFR-4 is measured only over Entries tagged by the AI and never corrected or re-tagged (no new column).
4. Any text edit on an Entry whose Tag source isn't me clears the Tag fields, tag_attempts and tagging_gave_up_at, so it is retried. Fix the invariant and the tag_attempts note to agree.
5. Invariants: updated_at is set by a database trigger on every update.
6. AC-5.1: overlapping time counts once, for the Entry created last.
7. AC-5.3: the Server records Review done for the week shown.

## Consistency issues, accepted
- Remove the "O3/O4" ids from Out of scope; say "Apple Shortcut logging and a native app (see 01-research.md)".
- UC-3 exception 4a points at a missing step: renumber to the step that sends the push.
- Starting Category, This week page: use them consistently and add both to Glossary proposals (Starting Category: one of the five from README §Categories; This week page: the page showing a week's time per Category, defaulting to the current week, with earlier weeks browsable).
- "Proposed Suggested category" and "recorded against": use one wording, the Entry's Suggested category, and add it to Glossary proposals if needed.
- form_opened_at is sent on create only; NFR-1 measures creates only. Say so in AC-1.3.
- Local copy: the brief says "last 2 weeks"; the lead will reword the brief to "this week and last week". Use that wording.
- UC-2 exception 1c: if iOS cleared storage, the session is gone too, so sign in (UC-6) first.
- NFR-7: record the Quiet hours in force with each Nudge in notifications_sent, or measure against the current Quiet hours only (simplest: current Quiet hours, say so).
- Entries whose tagging gave up are in the Local copy and shown as Untagged with a "couldn't tag" note on the This week page; tag them by hand (AC-3.2).
