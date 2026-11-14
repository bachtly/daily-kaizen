# Insights

## What it does
- Each Sunday at 18:00 (my time zone), an hour before the Review reminder, the Server turns my week's Entries into **insights**: a finding from my own log, an if-then suggestion ("If it's 21:00, then I …"), and one checked source.
- The Week page shows the top 3; **See more** lists the rest. **Why:** opens the source: what it showed, the case against when evidence is mixed, its limits, and a link. **See N Entries** lists the Entries behind it.
- **Make it next week's change** starts a small experiment; it prefills the review note. The next week's page shows it (**Keep it one more week** while it runs) and then its result: "Usual 5h–7h → 2h · Helped".
- **Spotted by AI**: up to 5 more findings the AI reads from my week's own data (a timeline per day and plain totals), beyond the fixed checks. Each is labelled "AI-spotted · not a fixed check", has **See N Entries**, and a source only when one from the library fits (otherwise it says none was checked). They can't be next week's change: there's nothing code can measure.
- **Not useful** hides the card, with Undo and an optional one-line reason the AI reads from then on.
- **When**: a heatmap of days × hours coloured by Category (or one Activity), with hours of many switches outlined; tap an hour for what was in it. **Last 8 weeks**: one line per Category.
- **Get insights now** asks for this or last week's insights at once, any day from 2 logged days, so I don't wait for Sunday. Mid-week cards cover the week so far. While cards are shown, **Regenerate insights** (or **Update insights** after more logging) replaces the ones I haven't acted on.
- Settings → **What the coach remembers**: the AI's short note about me, rewritten each week; I can edit or clear it.

## Rules
- Code computes every number; the AI only words the cards, picks a source from the allowed list, and may say a card may not apply (the card then sorts last). A card whose wording fails a check (ids, source, numbers, length, if-then) uses template wording.
- Sources come only from the hand-checked evidence library; a card keeps a copy of its source.
- An AI-spotted finding passes the same checks (lengths, if-then, numbers only from the data it was given) and must point at timeline items from my week; one that fails is dropped, not replaced. They come after the fixed-check cards, and the AI runs even when no fixed check fires, so a first week still gets findings. Not useful hides just that card.
- Sunday's insights need 5 **logged days** in the week: a day with at most 180 min Unlogged outside Quiet hours (unlogged sleep doesn't count against it). Asking for them needs 2.
- Before Sunday 18:00 the week is "so far": a target I'm under isn't a missed target yet (a Waste ceiling I've passed is), and the coach note isn't rewritten. Sunday's run still happens after a mid-week one.
- 9 detectors: Waste in a 3-hour window, broken-up Deep work, my best Deep block length, scattered short Shallow Entries, a missed target (#74), short sleep (under 7 h), work in the 2 h before Quiet hours, Recovery under 2 h a day, Maintenance far from my usual.
- At most 8 fixed-check insights a week, one per kind, ranked by hours at stake × how useful that kind has been for me × freshness.
- Not useful hides that kind of insight, for that subject, for 8 weeks. One shown 3 weeks in a row with no action pauses for 4.
- One accepted change per week; accepting another replaces it. Only this or last week's cards can be accepted.
- A change result (Monday 04:00, once the week has fully ended) compares the change weeks with up to 4 earlier weeks with ≥ 5 logged days: **Helped** only when it beats every one of them; at least 3 are needed.
- Weeks before my first Entry aren't sent as history.
- The coach note is at most 1200 characters, rewritten (never appended), keeps the lines I wrote word for word, and may only use numbers from my history; otherwise the old note stays.
- Asking for insights: at most once a minute; it can take a minute. A failed AI run gives template cards and retries that Sunday evening, up to 3 runs.
- No Entry text goes to the AI, only Category and Activity names and numbers.
- No new notifications; the Review reminder stays the only nudge. Everything except reading needs a connection.

## Decisions
- Fixed detectors in code with research thresholds and my own baselines rank first, and alone can be a change with a measured result. AI-spotted findings were added beside them (#80): the AI only quotes numbers code put in its data, and they're labelled and can't be measured changes.
- Memory = every week's numbers, changes, results and dismissals kept by code, plus a short note the AI rewrites and I can edit; not an AI appending memories (errors pile up) or the raw history in every prompt (#80).
- Results by beating every usual week, not by comparing with last week (regression to the mean) (#80).
- Not useful is an order (8-week hide), not a soft signal (#80).
- Model `claude-opus-5-5`, effort medium, one call per user-week (#80).
- One shared facts module for the phone and the Server, so the Week totals, heatmap and insights agree (#80).

Details: [archived design](../design/2026-11-14-insights/design.md).
