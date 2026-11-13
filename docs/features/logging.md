# Logging

## What it does
- A floating **+** on every screen opens the full-screen Log sheet: one text field, a start and end time, and a day.
- The **Day view** (the home screen) shows one day at a time: its Entries in time order, with **Unlogged** slots between them. A week strip, week buttons and Today move between days.
- **Fill** on a slot opens the Log sheet set to that slot, so a missed day is backfilled one Entry at a time.
- I can edit or delete an Entry from the Day view.

## Rules
- Log now starts at the latest end time in the Local copy (or the start of today) and ends now; Fill uses the slot's times.
- The sheet can log any past day, starting on the day shown; no future days.
- Empty text, an end not after the start, or an end more than 5 minutes ahead is refused on the wrong field.
- An overlap with another Entry warns and still saves; overlapping time counts once, for the Entry created last.
- After a save, what is left of a slot stays a slot.
- Every slot is shown, on any day, not only today.
- An Entry sent twice (resend after an unknown result) never makes a duplicate.
- A text edit on an Entry whose Tag or Activity wasn't set by me clears it, so it is labelled again.
- The text is stored as typed; the AI only labels it.
- The floating **+** never covers the last row: every scrolling screen has bottom space equal to the button plus its margin (#70).
- Saves need a connection; on failure the sheet keeps my text and says so.
- Up to 3 Activity chips sit above the field (see [activities](activities.md)); with none yet it shows the 5 most recent texts.

## Decisions
- One Day view for logging, reviewing and backfilling, instead of a Log form plus a long This week list (#46).
- Every write needs a connection; there is no offline Outbox (rejected: sync rules, deletes of unseen Entries, best-effort iPhone storage).
- Week controls are round ‹ › buttons, not a text range (#46).
- Space for the + is set once where it is placed, not per screen (#70).

Details: [archived design](../design/2026-11-06-mvp/05-ui.md).
