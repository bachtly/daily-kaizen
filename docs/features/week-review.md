# Week review

## What it does
- The **Week** page shows the current week (Monday 00:00 to now) and lets me browse earlier weeks.
- It shows time per Category, Untagged and Unlogged, time per Activity (see [activities](activities.md)), and time logged per day; a day row opens that day.
- Suggested categories appear as a card to approve or reject.
- **Mark review done** records that I reviewed the week shown.
- The page shows when the Local copy was last refreshed.

## Rules
- Days and weeks are split in my latest reported time zone; an Entry crossing midnight or a week boundary counts in each part.
- Only past time counts; overlapping time counts once, for the Entry created last; Unlogged is elapsed time no Entry covers.
- An empty week shows "Nothing logged this week yet." and only Unlogged.
- Review done is once per week and works for last week too, so a Monday review counts.
- The current and previous week come from the Local copy; earlier weeks need a connection and show "Earlier weeks need a connection." with Retry when offline.
- Approve, reject, Review done, rename and merge need a connection.
- Wrong Tags are corrected on the Day view (Tag source me).
- The review never judges me: no scores or streaks.

## Decisions
- Week is a summary only, with no Entry list; Entries live on the Day view (#46).
- Time per activity sits under Time per category (#57).
- Targets per Category and one change for next week are not built yet (#74).

Details: [archived design](../design/2026-11-06-mvp/05-ui.md).
