# Week review

## What it does
- The **Week** page shows the current week (Monday 00:00 to now) and lets me browse earlier weeks.
- It shows time per Category, Untagged and Unlogged, time per Activity (see [activities](activities.md)), and time logged per day; a day row opens that day.
- Suggested categories appear as a card to approve or reject.
- An **Activity** can have a **weekly target** in hours, optionally narrowed to one Category: `Company A · Deep = 15 h` counts only Company A time tagged Deep; `Lunch · any = 15 h` counts all Lunch time. An Activity can have both an *any* target and Category ones.
- Time per activity shows "actual / target" with a tick on the bar when the Activity has an *any* target; the open row's Category lines show theirs. **Target** on an open row sets the *any* target; tap a Category line to set that pair.
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
- Target: whole or half hours, 0.5 to 80; empty clears it.
- An Activity with a target stays listed in a week with no time (0h / 15h), so a missed target shows.
- Merging A into B moves A's targets to B; where B already has a target for the same Category (or *any*), B's stays.
- With several Activities on an Entry, an Activity's actual is its equal share, as in the panel.
- A week's actual is compared with the **current** target; targets are not versioned.
- Over target is the bar passing the tick, with no colour: a target may be a ceiling or a floor, and the app doesn't judge which.
- One change: at most 140 characters, saved with the Review done record, not editable afterwards. It shows on the **following** week's page only.
- Setting a target needs a connection, like Review done.
- The review never judges me: no scores or streaks.

## Decisions
- Week is a summary only, with no Entry list; Entries live on the Day view (#46).
- Time per activity sits under Time per category (#57).
- Targets per Activity and one change for next week close the loop *log, review, intend, change*; nothing else is added (#74).
- Category as an optional second key, not targets per Category alone: those can't tell Company A Deep from Side project Deep (#74).
- Set only the pairs I want, not a target on every Activity × Category cell up front: most would stay empty (#74).
- No colour for over/under: the app can't know whether a target is a floor or a ceiling (#74).
- Current target for every week, not versioned targets: simpler, and old weeks are rarely revisited (#74).
- No streaks, scores or new notifications: the Review reminder stays the only nudge (#74).

Details: [archived design](../design/2026-11-06-mvp/05-ui.md).
