# MVP design

The MVP covers capture, AI tagging and a weekly summary, for one user on an iPhone.
Improvement experiments come in v1 and are out of scope here.

## Architecture

```text
iPhone (home-screen web app: React + Vite, hosted on Cloudflare Pages)
  ├─ Log an entry: text + start and end time
  ├─ Saved on the phone first, then synced to Supabase when online
  └─ "This week" page · correct tags · approve suggested categories
            │
Supabase
  ├─ Database: entries, categories, push subscriptions, settings
  ├─ New entry arrives → server function calls Claude Haiku 5.5 → saves the category
  └─ Scheduled jobs → server function → email (Resend) and push notifications
```

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| Phone app | React + Vite, `vite-plugin-pwa`, Dexie | Best-documented setup for offline web apps |
| Hosting | Cloudflare Pages | Free, doesn't meter static bandwidth, deploys from GitHub |
| Backend | Supabase (database, login, Edge Functions, pg_cron) | Least server code to write |
| AI tagging | Claude Haiku 5.5 | Fast, and about $0.04 a month at 30 entries a day |
| Email | Resend | Simple API, called from a server function |
| Push | Web Push | No separate app needed; the home-screen install is required on iPhone |

## How it works

### Logging

- An entry is free text plus a start and end time. Both times are required, so there are no running timers.
- To keep logging fast, start defaults to the end of the last entry and end defaults to now.
- Entries can be backfilled by changing the times.
- If an entry overlaps another, the app warns but still saves it.

### Offline and sync

- Every entry is saved on the phone first, with an ID created on the phone.
- The app syncs when it opens and when it detects it's back online. iPhone Safari has no background sync.
- Sending an entry twice is harmless because the ID already exists on the server.

### Tagging

- Tagging runs on the server after an entry is saved, so offline entries get tagged once they sync. The AI key never reaches the phone.
- The AI picks one existing category. It may also suggest a new one, which waits for approval.
- Until a suggestion is approved, the entry stays in the best existing category.
- If tagging fails, the entry shows as "Untagged" and is retried.
- Correcting a tag by hand always wins, and the AI doesn't overwrite it.

### Weekly review

- The "This week" page shows time per category and an "Unlogged" bar, measured over the full 24 hours of each day.
- Sleep is logged like any other entry, the next morning.
- The email and push reminder go out on Sunday at 19:00 in the phone's time zone.

### Push notifications

| Notification | When |
| --- | --- |
| Review reminder | Sunday evening |
| Nudge to log | 3 hours with no entry, at most once per gap, never in quiet hours |
| Category suggestion | The AI proposes a new category |

- Quiet hours are a setting, 23:00–07:00 by default. They prevent overnight nudges.
- The server can't see entries that haven't synced yet, so offline logging can occasionally trigger an unnecessary nudge. This is acceptable for the MVP.

### Time zones

- Each entry stores a universal timestamp and the phone's time zone at logging time.
- The phone reports its current zone on each sync, and scheduled jobs use the latest one.

### Login and security

- Login is by email and a 6-digit code. Email links open in Safari rather than the home-screen app on iPhone, so the app wouldn't stay signed in.
- Database row-level security limits all data to the signed-in user.
- API keys stay in server function secrets. Scheduled jobs call functions with a shared secret.

## Data

| Table | Key fields |
| --- | --- |
| `entries` | `id` (from the phone), `text`, `started_at`, `ended_at`, `time_zone`, `category_id`, `tag_source` (AI or me) |
| `categories` | `id`, `name`, `description`, `status` (active or suggested) |
| `push_subscriptions` | `id`, `endpoint`, `keys` |
| `settings` | `time_zone`, `quiet_start`, `quiet_end`, `last_nudged_at` |

## MVP is done when

I log entries on at least 12 of 14 days and complete 2 weekly reviews using the app.

## To verify during the build

- Whether Supabase's free plan pauses inactive projects. Daily logging should prevent it.
- Web Push on the actual iPhone, as early as possible, since setups can fail silently.
- Current free-plan limits on the Cloudflare, Supabase and Resend pricing pages.

## Later

- Benchmark Haiku 5.5 against GPT nano-class and Gemini Flash-Lite models, using real logged entries.
