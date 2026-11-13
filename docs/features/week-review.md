# Week review

## What it does
- The **Week** page shows the current week (Monday 00:00 to now) and lets me browse earlier weeks.
- It shows time per Category, Untagged and Unlogged, time per Activity (see [activities](activities.md)), and time logged per day; a day row opens that day.
- Suggested categories appear as a card to approve or reject.
- Each Category can have an optional **weekly target** in hours. Time per category shows "actual / target" with a tick on the bar; tap a row to set or clear its target.
- **Mark review done** records that I reviewed the week shown, with an optional **one change for next week** (one line).
- The next week's page shows last week's change at the top, so it is in front of me while that week happens.
- The page shows when the Local copy was last refreshed.

## Rules
- Days and weeks are split in my latest reported time zone; an Entry crossing midnight or a week boundary counts in each part.
- Only past time counts; overlapping time counts once, for the Entry created last; Unlogged is elapsed time no Entry covers.
- An empty week shows "Nothing logged this week yet." and only Unlogged.
- Review done is once per week and works for last week too, so a Monday review counts.
- The current and previous week come from the Local copy; earlier weeks need a connection and show "Earlier weeks need a connection." with Retry when offline.
- Approve, reject, Review done, rename and merge need a connection.
- Wrong Tags are corrected on the Day view (Tag source me).
- Target: whole or half hours, 0.5 to 80; empty clears it. It belongs to the Category, not the Activity.
- A week's bar compares that week's actual with the **current** target; targets are not versioned.
- Over target is the bar passing the tick, with no colour: Waste's target is a ceiling and Deep's a floor, and the app doesn't judge which.
- One change: at most 140 characters, saved with the Review done record, not editable afterwards. It shows on the **following** week's page only.
- Setting a target needs a connection, like Review done.
- The review never judges me: no scores or streaks.

## Decisions
- Week is a summary only, with no Entry list; Entries live on the Day view (#46).
- Time per activity sits under Time per category (#57).
- Targets per Category and one change for next week close the loop *log, review, intend, change*; nothing else is added (#74).
- Targets per Category, not per Activity: Activities come and go, Categories are stable (#74).
- No colour for over/under: the app can't know whether a target is a floor or a ceiling (#74).
- Current target for every week, not versioned targets: simpler, and old weeks are rarely revisited (#74).
- No streaks, scores or new notifications: the Review reminder stays the only nudge (#74).

Details: [archived design](../design/2026-11-06-mvp/05-ui.md).
