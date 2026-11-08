# daily-kaizen MVP: API

Direction: [D3](03-data-model.md#decisions) (every write online, read-only Local copy) and
[D2](02-requirements.md#decisions) (Tagging check). Shapes use the fields in
[03-data-model.md](03-data-model.md). The repo has no API yet, so the style is Supabase's own: the generated API (PostgREST)
for table reads and writes, Postgres functions called through it (`POST /rest/v1/rpc/<name>`) for writes that touch
Server-owned fields, and Edge Functions only where the Server calls something outside the database (AI, push, email)
([D4](#decisions)).

**Rule for choosing:** plain row write → generated API, guarded by row-level security (RLS) and column grants. Write that
sets a Server-owned field or spans rows → Postgres function (one transaction, no extra hop). Needs the AI, Web Push or
Resend → Edge Function. Every phone write sends `Prefer: return=representation` so the app sees what the Server saved (AC-2.1).

## Surface

| Operation | Kind | Caller | Covers | New / changed |
|---|---|---|---|---|
| Create Entry | `POST /entries` (generated) | Phone | AC-1.2, AC-2.1, AC-2.2 | New |
| Edit Entry | `PATCH /entries?id=eq.<id>` | Phone | AC-1.3, AC-3.2, AC-3.3 | New |
| Delete Entry | `DELETE /entries?id=eq.<id>` | Phone | AC-1.3 | New |
| Change an Entry's Tag | `rpc/set_entry_tag` | Phone | AC-4.1 | New |
| Approve / reject Suggested category | `rpc/approve_category`, `rpc/reject_category` | Phone | AC-4.2, AC-4.3 | New |
| Review done | `POST /weekly_reviews` | Phone | AC-5.3 | New |
| Settings and time zone report | `PATCH /settings?user_id=eq.<my id>` | Phone | AC-2.3, AC-6.3 | New |
| Push subscription report | `POST /push_subscriptions` (upsert) | Phone | AC-2.3, AC-6.2 | New |
| Local copy refresh, earlier week | `GET /entries`, `/categories`, `/settings`, `/weekly_reviews` | Phone | AC-2.3, AC-2.4, AC-5.1 | New |
| Sign in | Supabase Auth email code (`signInWithOtp`, `verifyOtp`) | Phone | AC-7.1, AC-7.2 | Existing, configured |
| Tag Entries | Edge Function `tag-entries` | Entry insert trigger (pg_net); Tagging check (pg_cron, 15 min) | AC-3.1, AC-3.2, AC-3.4 | New |
| Send notifications | Edge Function `send-notifications` | Notification check (pg_cron, 5 min) | AC-5.2, AC-6.1 | New |
| Push payloads | Web Push message | Server → phone | AC-3.4, AC-5.2, AC-6.1 | New |

## Contracts

`user_id` is never sent: it defaults to the signed-in user. Times are ISO 8601 with offset; ids are uuids.

**Create Entry.** Request: `{id, text, started_at, ended_at, time_zone, form_opened_at}`, `id` made by the phone when the form
opens, with `Prefer: resolution=ignore-duplicates`. Response `201` with the saved row, or `201` with `[]` when the id already
exists, (resend after an unknown result, AC-2.2); the app then sends `PATCH /entries?id=eq.<id>` with the form's fields and shows that
result. The insert fires tagging.

**Edit Entry.** Request: `{text, started_at, ended_at, time_zone}`. Response `200` with the row, including the Tag fields after any
clearing (a text change when Tag source isn't me clears the Tag, AC-3.2). `200 []` = the Entry no longer exists; the app treats it as `entry_not_found`.

**Delete Entry.** No body. `200`/`204` whether or not a row was removed: deleting twice is fine.

**Change an Entry's Tag.** Request: `{entry_id, category_id}`. Sets the Tag, Tag source me, `tagged_at` now. Response `200 {entry}`; an Entry not on the Server → 400 `entry_not_found`.

**Approve / reject.** Request: `{category_id}`. Approve sets `active` and moves the Entries that have it as their Entry's Suggested
category, except Tag source me, keeping their `tagged_at` and `tag_source` (AC-4.2); reject sets `rejected` (AC-4.3). Response `200 {category, moved_entry_ids}` (reject: `[]`).
Repeating the same decision returns `200` and changes nothing.

**Review done.** Request: `{week_start}` (the Monday of the week shown, my time zone), `Prefer: resolution=ignore-duplicates`.
Response `201` with the row, or `[]` if already done; both mean done.

**Settings.** Request: any of `{time_zone, quiet_start, quiet_end}` (`HH:MM`). Response `200` with the row. On open the app sends
`{time_zone}` only; the settings page sends the Quiet hours.

**Push subscription.** Request: `{endpoint, p256dh, auth}` with `?on_conflict=endpoint` and `Prefer: resolution=merge-duplicates`.
Response `201`. Sent on each open when permission is granted, and after "Turn on notifications".

**Local copy refresh.** Four reads, run together; the app replaces the Local copy only when all four succeed:
- `GET /entries?ended_at=gt.<previous Monday 00:00>&order=started_at` with `id, text, started_at, ended_at, time_zone,
  category_id, tag_source, suggested_category_id, tagging_gave_up_at, created_at` (`created_at` orders overlaps, AC-5.1);
- `GET /categories` (`id, name, description, status`); `GET /settings` (`time_zone, quiet_start, quiet_end`);
- `GET /weekly_reviews?week_start=gte.<previous Monday>` (`week_start`), so the This week page shows Review done offline too.

An earlier week is the same Entry read with `ended_at=gt.<week start>&started_at=lt.<week end>`, shown but not stored.

**Tag Entries (internal).** Request: `{entry_id}` from the insert trigger, or `{}` from the Tagging check (all Untagged Entries not given
up and created over 2 minutes ago). Header `x-job-secret`. Response `202` at once; work continues after the reply (`waitUntil`, R3), since pg_net stops waiting
after 2 s. Repeating a call is safe (data model Invariants). AI reply the function expects: `{category_name, proposed:
{name, description} | null}`; a name that isn't an Active Category counts as a failed attempt. `tag_attempts` increases only
when the guarded update matches the Entry.

**Send notifications (internal).** Called by the Notification check. Request `{}`, header `x-job-secret`. Sends any due Nudge (AC-6.1) and the Review reminder
email and push (AC-5.2), recording each in `notifications_sent` first. Response `200 {nudges, review_reminders}`. Every
5 minutes so the reminder lands within 5 minutes of 19:00 (NFR-6); skipped while `settings.time_zone` is null.

**Push payloads** (Declarative Web Push, iOS 18.4+, R4): `{web_push: 8030, notification: {title, body, navigate}}`.
Nudge → log form; Review reminder and Category suggestion → This week page. Paths and wording: ui stage. A push service
answer of 404 or 410 deletes that Push subscription; nothing is retried.

## Errors

PostgREST returns `{code, message, details, hint}`. Every validation error is HTTP 400 and carries one error key: the check
constraint name, or the `message` of an error raised by a database trigger or function. The app maps keys to fields (resolves OQ-4).

| Error key | When | HTTP | Retryable | App shows |
|---|---|---|---|---|
| `entry_text_empty` | Text empty or only spaces | 400 | No | "Write what you did." on text |
| `entry_end_not_after_start` | `ended_at <= started_at` | 400 | No | "End must be after start." on end |
| `entry_end_in_future` | `ended_at` over 5 min after Server now (create and edit) | 400 | No | "End can't be in the future." on end |
| `time_zone_unknown` | Time zone not a name Postgres knows (Entry or settings) | 400 | No | "Time zone not recognised." |
| `quiet_hours_equal` | `quiet_start = quiet_end` | 400 | No | "Start and end must differ." |
| `week_start_not_monday` | `week_start` isn't a Monday | 400 | No | App bug; "Couldn't save." |
| `entry_not_found` | Edit (`200 []`, mapped by the app) or Tag change (`set_entry_tag`, 400) of an Entry not on the Server | 400 (`set_entry_tag` only) | No | "This Entry was deleted." and refresh |
| `category_not_active` | Tag change to a Category that isn't active | 400 | No | "Pick another category." and refresh |
| `category_already_decided` | Approve a rejected, or reject an active, Category | 400 | No | Refresh; nothing to do |
| Session lost (`PGRST301`/`PGRST303`) | Login session expired or missing | 401 | After sign-in | Keep form; UC-6 |
| No connection, timeout (10 s, judgement) | Result unknown | none | Yes, same request | "Needs a connection." Keep form (AC-2.2) |
| Server error | 5xx | 5xx | Yes | "Couldn't save. Try again." |

Overlaps are not an error: the app warns from the Local copy and saves (AC-1.2). Phone writes to Server-owned fields
are refused by column grants (403); the app never sends them.

## Auth

| Operation | Who may call | Check |
|---|---|---|
| Entry, settings, Review done, Push subscription writes | Signed-in user | RLS policies for `authenticated` only, `user_id = auth.uid()`. Insert, update, delete revoked on all `public` tables from `anon` and `authenticated`, then granted per table: `entries` select, delete, insert `id, text, started_at, ended_at, time_zone, form_opened_at`, update `text, started_at, ended_at, time_zone`; `categories` select; `settings` select, update `time_zone, quiet_start, quiet_end`; `weekly_reviews` select, insert; `push_subscriptions` select, insert, update; `notifications_sent` none. Backend writes the SQL |
| Reads | Signed-in user | RLS and the grants above |
| `set_entry_tag`, `approve_category`, `reject_category` | Signed-in user | `security definer`, `set search_path = ''`, execute granted to `authenticated` only; explicit `user_id = auth.uid()` check on the Entry and Category |
| `tag-entries`, `send-notifications` | pg_cron and the Entry insert trigger only | `x-job-secret` equals a Server secret, which the trigger and pg_cron jobs read from Supabase Vault, never inline; JWT check off; the function uses the service role |
| Sign in | My email only | Sign-ups disabled; code sent only to the existing user (AC-7.2) |

## Behaviour

- **Idempotency:** create and Review done ignore duplicates by key; edit, settings, Tag change and the push upsert set
  the same values again; delete, approve and reject are no-ops when already done. So every phone write is safe to resend
  after an unknown result (AC-2.2). Internal calls are safe to repeat (D2; `notifications_sent` key).
- **Pagination:** none. The refresh returns at most ~400 Entries, a week ~200, under the 1,000-row default limit.
- **Rate limits:** Supabase defaults; sign-in code limits are OQ-1 (backend).
- **Timeouts:** the phone waits 10 s (judgement; NFR-2 expects under 1 s); the AI call timeout is the backend stage's.

## Events and async

| Event / job | Producer | Consumers | Schema | Ordering key | Delivery |
|---|---|---|---|---|---|
| Entry inserted | AFTER INSERT trigger (`net.http_post`) | `tag-entries` | `{entry_id}` | Entry id | At most once; the Tagging check covers losses |
| Tagging check | pg_cron, 15 min; skips Entries created in the last 2 min | `tag-entries` | `{}` | none | Every run |
| Notification check | pg_cron, 5 min | `send-notifications` | `{}` | `(kind, about)` | At most once per Nudge or week |
| Category suggestion | `tag-entries`, after commit, new Suggested category only | Phone | Push payload | none | At most once, no retry |

## Compatibility

Greenfield, nothing to break. The app and schema ship together; schema changes are additive, and a new app version may
rebuild the Local copy. `docs/mvp-design.md` (Outbox sync) is superseded here by [D3](03-data-model.md#decisions).

## Consumer check

| Consumer | Flow | Buildable? |
|---|---|---|
| Log form | UC-1 create, edit, delete, resend | Yes |
| App open | UC-2 refresh, time zone, Push subscription | Yes |
| This week page | UC-4 weeks, Tag change, approve/reject, Review done | Yes |
| Settings page | AC-6.2, AC-6.3 | Yes |
| Service worker / iOS | Push payloads | Yes |
| pg_cron, Entry insert trigger | UC-3, UC-5, AC-5.2 | Yes |

## Decisions

### D4 · Database functions for Server-owned writes; Edge Functions only for outside calls

Most phone writes are plain row changes on my own fields. Changing an Entry's Tag and approving or rejecting a Suggested
category set Server-owned fields and can change several rows at once. Tagging, Nudges and the Review reminder call outside
services (the AI, Web Push, Resend). Drivers: a Server-owned field is never written by the phone directly
([03-data-model.md](03-data-model.md)); approving a Suggested category moves Entries in one step or not at all; little
code; near-free.

| Option | Outcome | Reason |
|---|---|---|
| Generated API for plain writes, Postgres functions (rpc) for Server-owned writes, Edge Functions only for the AI, Web Push and Resend | **Chosen** | Each write is one transaction with no extra hop; RLS and column grants enforce the Server-owned field rule |
| An Edge Function for every write | Rejected | An extra hop on every write, and transactions handled by hand |
| Generated API only, with database triggers for all logic | Rejected | Hidden trigger logic is hard to follow, and calls to outside services don't belong in triggers |

Consequences:
- Approve and reject complete fully or not at all. Validation lives in the database as checks that return named error
  keys, so every write path follows the same rules.
- Logic is split between SQL and TypeScript; the SQL side is small and the split is one rule.
- Supabase's default table grants are wide open, so the backend revokes them and grants per table.

## Glossary proposals

Merged into the brief's Glossary at approval.
