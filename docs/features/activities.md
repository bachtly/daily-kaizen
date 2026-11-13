# Activities

## What it does
- An **Activity** says what the time was for (Company A, Lunch, Game B). A **Category** says the kind of time. They are independent: Company A can be Deep in one Entry and Shallow in the next.
- The AI names an Activity for each Entry in the same call as the Category. Activities start empty and grow from my text.
- The Log sheet shows up to 3 **chips** with the Activities I use most at that weekday and hour; a tap inserts "Name " into the text.
- On the Week page, **Time per activity** lists each Activity with a bar split by Category; tap a row for its split, **Rename** and **Merge into…**.
- On the Day view each Entry shows its Activity and the editor can change it.

## Rules
- A name matching an Active Activity (ignoring case and extra spaces) or an alias is that Activity; any other name creates one directly, with no approval.
- No clear activity → no Activity, shown as "(no Activity)" and not asked again. A failed AI call is retried like an untagged Entry, sharing its attempt limit.
- My choice (pick, new name, or none) is never changed by the AI. Text edits clear an Activity I didn't set.
- Names are trimmed with inner spaces collapsed, 1 to 60 characters, unique per user ignoring case, counting merged names. An AI name over 60 is cut to 60.
- A blank name, a name over 60 and a taken name each get their own message; the app blocks blank input and caps typing at 60 (#71). In the Activity field, null still means none.
- Merge A into B moves A's Entries to B and keeps A's name as an alias of B, so the AI and anything I type with it resolve to B. Repeating a rename or merge changes nothing more.
- Chips: the 3 most used for the sheet's start weekday and hour over the last 12 weeks (each Entry in its own time zone), filled up by most used overall. No AI call. With no Activities, Recent chips show instead.
- Time per activity uses the Week page's split and overlap rules; hidden while I have no Activities. Rename and Merge need a connection.
- Existing Entries get labelled by the normal Tagging check, oldest first; there is no batch backfill.

## Decisions
- A second label independent of Category, not a derived Category, two input fields or a seeded set (#57).
- No suggest/approve step for Activities: mistakes are fixed by rename and merge, and a merged name stays an alias so it isn't recreated (#57).
- Stacked-bar rows under Time per category, not an Activity × Category matrix or Activities nested under Categories (#57).

Details: [archived design](../design/2026-11-06-mvp/03-data-model.md).
