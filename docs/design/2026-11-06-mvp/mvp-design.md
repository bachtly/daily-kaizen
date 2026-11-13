# MVP design

The MVP covers capture, AI tagging and a Weekly review, for one user on an iPhone.
Improvement experiments come in v1 and are out of scope here.
The detailed design is in [design/2026-11-06-mvp/design.md](design/2026-11-06-mvp/design.md); this page is the short version.

## Architecture

```text
iPhone (home-screen web app: React + Vite, hosted on Cloudflare Pages)
  ├─ Log an entry: text + start and end time
  ├─ Saved only when Supabase confirms (needs a connection)
  ├─ Read-only Local copy of this week and last week for offline viewing
  └─ "This week" page · correct tags · approve suggested categories
            │
Supabase
  ├─ Database: entries, categories, push subscriptions, settings, weekly reviews, notifications sent
  ├─ New entry arrives → Edge Function calls Claude Haiku 5.5 → saves the category
  ├─ Every 15 minutes → retry Untagged entries
  └─ Every 5 minutes → Edge Function → email (Resend) and push notifications
```

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| Phone app | React + Vite, `vite-plugin-pwa`, Dexie | Best-documented setup for home-screen web apps; Dexie holds the Local copy |
| Hosting | Cloudflare Pages | Free, doesn't meter static bandwidth, deploys from GitHub |
| Backend | Supabase (database, login, Edge Functions, pg_cron) | Least server code to write |
| AI tagging | Claude Haiku 5.5 | Fast and cheap: under $1 a month (price checked at setup) |
| Email | Resend | Simple API, called from an Edge Function |
| Push | Web Push via `@pushforge/builder` | No separate app needed; the home-screen install is required on iPhone |

## How it works

### Logging

- An entry is free text plus a start and end time. Both times are required, so there are no running timers.
- To keep logging fast, start defaults to the end of the last entry and end defaults to now.
- Entries can be backfilled by changing the times.
- If an entry overlaps another, the app warns but still saves it.

### Online writes, offline viewing

- Logging, editing, deleting and every other change need a connection ([D3](design/2026-11-06-mvp/03-data-model.md#decisions)). A change shows as saved only after the server confirms it, so a saved entry is never lost.
- Without a connection the app says so and keeps what I typed while it stays open. Time missed offline is logged later as a backfill.
- The entry ID is created on the phone, so saving again after an unknown result never makes a duplicate.
- A read-only Local copy of this week and last week lets me view the "This week" page and form defaults offline. It refreshes when the app opens online.

### Tagging

- Tagging runs on the server after an entry is saved. The AI key never reaches the phone.
- The AI picks one existing category. It may also suggest a new one, which waits for approval.
- Until a suggestion is approved, the entry stays in the best existing category. Approving moves those entries to it; a rejected suggestion is never proposed again.
- If tagging fails, the entry shows as "Untagged" and is retried every 15 minutes, up to 3 attempts; after that I tag it by hand.
- Correcting a tag by hand always wins, and the AI doesn't overwrite it. Editing the text of an AI-tagged entry re-tags it.

### Weekly review

- The "This week" page shows time per category, Untagged and an "Unlogged" bar, counting only time that has passed (AC-5.1). Earlier weeks can be browsed when online.
- I can mark a week's review as done.
- Sleep is logged like any other entry, the next morning.
- The email and push reminder go out on Sunday at 19:00 in the phone's time zone.

### Push notifications

| Notification | When |
| --- | --- |
| Review reminder | Sunday evening |
| Nudge to log | The Nudge gap (3 hours by default) after the latest entry's end time, at most once per gap, never in quiet hours |
| Category suggestion | The AI proposes a new category |

- Quiet hours are a setting, 23:00–07:00 by default. They prevent overnight nudges.

### Time zones

- Each entry stores a universal timestamp and the phone's time zone at logging time.
- The phone reports its current zone each time it opens online, and scheduled jobs use the latest one.

### Login and security

- Login is by email and a 6-digit code. Email links open in Safari rather than the home-screen app on iPhone, so the app wouldn't stay signed in.
- Anyone can sign up with an email code; a new account starts with the 5 Categories. Database row-level security limits all data to the signed-in user.
- API keys stay in Edge Function secrets. Scheduled jobs call functions with a shared secret.

## Data

Full field list: [03-data-model.md](design/2026-11-06-mvp/03-data-model.md). Fields marked *server* are written only by the server.

| Table | Key fields |
| --- | --- |
| `entries` | `id` (from the phone), `text`, `started_at`, `ended_at`, `time_zone`, `form_opened_at`, *server:* `category_id`, `tag_source` (AI or me), `tagged_at`, `suggested_category_id`, `tag_attempts`, `tagging_gave_up_at` |
| `categories` | `id`, `name`, `description`, `status` (active, suggested or rejected) |
| `push_subscriptions` | `id`, `endpoint`, `p256dh`, `auth` |
| `settings` | `time_zone`, `quiet_start`, `quiet_end`, `nudge_gap_hours` |
| `weekly_reviews` | `week_start`, `done_at` |
| `notifications_sent` | `kind` (nudge or review reminder), `about`, `sent_at` |

## MVP is done when

I log entries on at least 12 of 14 days and complete 2 weekly reviews using the app.

## To verify during the build

- Whether Supabase's free plan pauses inactive projects. Daily logging should prevent it.
- Web Push on the actual iPhone, as early as possible, since setups can fail silently.
- Current free-plan limits on the Cloudflare, Supabase and Resend pricing pages.

## Later

- Benchmark Haiku 5.5 against GPT nano-class and Gemini Flash-Lite models, using real logged entries.
