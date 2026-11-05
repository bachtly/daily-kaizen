# daily-kaizen

A personal **capture → classify → review → optimise** loop for how you spend your time.

## Problem statement

Log what I actually do during the day — across devices and places, not via screen tracking —
have AI categorise each activity (e.g. deep, shallow, maintenance, waste, recovery),
then review regularly to see where time is wasted and make continuous improvements (kaizen),
measuring whether those changes actually reduce waste.

## Goals

Built for one user (me). Over the first few months, in this order:

1. **Awareness**: get an honest picture of where my time actually goes.
2. **Review habit**: make a weekly kaizen review a ritual that sticks.
3. **Less waste**: waste time goes down week over week, and the numbers show it.

Capture must be:

- **Low friction**: a few seconds of free text, e.g. "scrolled reddit 20m". AI does the tagging.
- **Available anywhere**: phone, laptop, away from home.
- **Backfill-friendly**: log after the fact, e.g. "lunch 12–13" written at 3pm.

### Categories

Categories are dynamic. The list below is the starting set. When an entry doesn't fit,
the AI can suggest a new category, and I decide whether to keep it.

| Category | Examples |
| --- | --- |
| **Deep** | Building a hard feature, studying a new topic, writing a design doc |
| **Shallow** | Answering email and chat, quick admin tasks, routine status meetings |
| **Maintenance** | Cooking, cleaning, commuting |
| **Waste** | Doomscrolling, aimless YouTube, switching between apps without doing anything |
| **Recovery** | Sleep, a workout or walk, a relaxed meal with friends |

### Non-goals

- No screen or app tracking
- No team, client or billing features
- No to-do list or planner: it records what happened, not what to do next
- No precise timesheets: rough durations are fine

## Roadmap

**MVP: capture + weekly summary**

- Log free-text entries from anywhere, including backfill
- AI tags each entry with a category from the starting set, and can suggest new ones
- I can correct a wrong tag
- Weekly summary: time per category

**v1: the kaizen loop**

- AI suggests improvements from the week's data
- At the weekly review, pick one experiment for next week
- Next review shows whether the experiment reduced waste

**Later**

- Trends across many weeks
- Ideas from real use, after the MVP

## Prior art considered

- **TimeTagger**: tag-based, self-hosted web tracker with API (top candidate to build on)
  — <https://timetagger.app> · <https://github.com/almarklein/timetagger>
- **Traggo**: pure tag-based time spans, multi-dimension tags
  — <https://traggo.net> · <https://github.com/traggo/server>
- **Simple Time Tracker** (Android)
  — <https://github.com/Razeeman/Android-SimpleTimeTracker> · <https://f-droid.org/packages/com.razeeman.util.simpletimetracker>
- **Super Productivity**
  — <https://super-productivity.com> · <https://github.com/johannesjo/super-productivity>
- **Kimai**
  — <https://www.kimai.org> · <https://github.com/kimai/kimai>
- **life_logger** (CLI): one-line daily log entries in the terminal
  — <https://github.com/mvi-x/life_logger>
- **Telegram-based life loggers**, e.g. LIFE-LOGGER (Telegram bot that stores entries in GitHub)
  — <https://github.com/naborajs/LIFE-LOGGER>

No open-source tool covers the full loop; AI tagging and the waste review are the gap.

## Status

Idea stage. Goals and roadmap are drafted; build details are still to be decided.
