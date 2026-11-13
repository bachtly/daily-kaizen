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
| Change an Entry's Activity | `rpc/set_entry_activity` | Phone | AC-8.2 | New (#57) |
| Rename / merge an Activity | `rpc/rename_activity`, `rpc/merge_activity` | Phone | AC-8.3 | New (#57) |
| Activity counts for the chips | `rpc/activity_slots` | Phone | AC-8.4 | New (#57) |
| Review done | `POST /weekly_reviews` | Phone | AC-5.3, AC-5.5 | New; `next_change` added (#74) |
| Set a Category's weekly target | `rpc/set_category_target` | Phone | AC-5.4 | New (#74) |
| Settings and time zone report | `PATCH /settings?user_id=eq.<my id>` | Phone | AC-2.3, AC-6.3, AC-6.4 | New |
| Push subscription report | `POST /push_subscriptions` (upsert) | Phone | AC-2.3, AC-6.2 | New |
| Local copy refresh, earlier week | `GET /entries`, `/categories`, `/activities`, `/settings`, `/weekly_reviews`, `rpc/activity_slots` (an earlier week: Entries only) | Phone | AC-2.3, AC-2.4, AC-5.1 | New |
| Sign in | Supabase Auth email code (`signInWithOtp`, `verifyOtp`) | Phone | AC-7.1, AC-7.2 | Existing, configured |
| Tag Entries | Edge Function `tag-entries` | Entry insert trigger (pg_net); Tagging check (pg_cron, 15 min) | AC-3.1, AC-3.2, AC-3.4, AC-8.1, AC-8.6 | New |
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

**Change an Entry's Activity (#57).** Request: `{entry_id, name}`; `name` is free text or null (null = none). The name is resolved as in 03-data-model Invariants (an Active match, an alias → its target, otherwise a new Active Activity), then the Entry gets it with Activity source me. A non-null name that is empty after trimming → 400 `activity_name_blank` (null still means none); over 60 characters → 400 `activity_name_too_long`. Response `200 {entry}`; an Entry not on the Server → 400 `entry_not_found`. Repeating it changes nothing.

**Rename an Activity.** Request: `{id, name}`. Response `200 {activity}`; a name that is empty after trimming → 400 `activity_name_blank`; over 60 characters after normalising → 400 `activity_name_too_long`; another Activity (any status) already has that normalised name → 400 `activity_name_taken`; not mine, or merged → 400 `activity_not_found`. The same name again is a no-op.

**Set a Category's target (#74).** Request: `{category_id, minutes}`; `minutes` is 30 to 4800, or null to clear. Response `200 {category}`; out of range → 400 `category_target_out_of_range`; not my Category → 400 `category_not_found`. Repeating it changes nothing. The app sends whole or half hours as minutes.

**Merge an Activity.** Request: `{from, into}`. Moves my Entries from `from` to `into`, re-points earlier aliases of `from` to `into`, and marks `from` merged. Response `200 {activity}` (the target). A missing, not-mine or already merged `into`, a missing `from`, or `from = into` → 400 `activity_not_found`; repeating a done merge → `200`, no change.

**Activity counts.** `rpc/activity_slots()` returns `(activity_id, dow, hour, n)` rows: Entries with an Activity over the last 12 weeks, by weekday and hour of the start in each Entry's own time zone. The chips are computed on the phone from these rows (AC-8.4).

**Review done.** Request: `{week_start, next_change?}` (the Monday of the week shown, my time zone; `next_change` is one line of at most 140 characters, trimmed, empty = null), `Prefer: resolution=ignore-duplicates`. A longer note → 400 `next_change_too_long`.
Response `201` with the row, or `[]` if already done; both mean done.

**Settings.** Request: any of `{time_zone, quiet_start, quiet_end, nudge_gap_hours}` (`HH:MM`; whole hours 1–12). Response `200` with the row. On open the app sends
`{time_zone}` only; the settings page sends the Quiet hours and the Nudge gap.

**Push subscription.** Request: `{endpoint, p256dh, auth}` with `?on_conflict=endpoint` and `Prefer: resolution=merge-duplicates`.
Response `201`. Sent on each open when permission is granted, and after "Turn on notifications".

**Local copy refresh.** Six reads, run together; the app replaces the Local copy only when all succeed:
- `GET /entries?ended_at=gt.<previous Monday 00:00>&order=started_at` with `id, text, started_at, ended_at, time_zone,
  category_id, tag_source, activity_id, activity_source, suggested_category_id, tagging_gave_up_at, created_at` (`created_at` orders overlaps, AC-5.1);
- `GET /categories` (`id, name, description, status, weekly_target_minutes`); `GET /activities` (`id, name, status, merged_into_id`, all of mine); `rpc/activity_slots()`; `GET /settings` (`time_zone, quiet_start, quiet_end, nudge_gap_hours`);
- `GET /weekly_reviews?week_start=gte.<previous Monday>` (`week_start, next_change`), so the Week page shows Review done offline too.

An earlier week is the same Entry read with `ended_at=gt.<week start>&started_at=lt.<week end>`, shown but not stored.

**Tag Entries (internal).** Request: `{entry_id}` from the insert trigger, or `{}` from the Tagging check (all Untagged Entries not given
up and created over 2 minutes ago). Header `x-job-secret`. Response `202` at once; work continues after the reply (`waitUntil`, R3), since pg_net stops waiting
after 2 s. Repeating a call is safe (data model Invariants). AI reply the function expects: `{category_name, proposed:
{name, description} | null, activity_name: string | null}` (the prompt lists the Active Activity names; `activity_name` is a listed name, an alias, a new name, or null for none, #57); a Category name that isn't Active counts as a failed attempt. It works on an Entry missing either label and skips one only when both are set or it gave up; a label with source me is kept (AC-3.3, AC-8.2). `tag_attempts` increases only
when the guarded update matches the Entry.

**Send notifications (internal).** Called by the Notification check. Request `{}`, header `x-job-secret`. Sends any due Nudge (AC-6.1) and the Review reminder
email and push (AC-5.2), recording each in `notifications_sent` first. Response `200 {nudges, review_reminders}`. Every
5 minutes so the reminder lands within 5 minutes of 19:00 (NFR-6); skipped while `settings.time_zone` is null.

**Push payloads** (Declarative Web Push, iOS 18.4+, R4): `{web_push: 8030, notification: {title, body, navigate}}`.
Nudge → Day view (today) with the Log sheet open; Review reminder and Category suggestion → Week page. Paths and wording: ui stage. A push service
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
| `nudge_gap_out_of_range` | `nudge_gap_hours` not 1–12 | 400 | No | "Choose 1 to 12 hours." |
| `week_start_not_monday` | `week_start` isn't a Monday | 400 | No | App bug; "Couldn't save." |
| `entry_not_found` | Edit (`200 []`, mapped by the app) or Tag or Activity change (`set_entry_tag`, `set_entry_activity`, 400) of an Entry not on the Server | 400 (the rpcs only) | No | "This Entry was deleted." and refresh |
| `category_not_active` | Tag change to a Category that isn't active | 400 | No | "Pick another category." and refresh |
| `activity_name_blank` | Rename, or an Activity change with a non-null name, that is empty after trimming | 400 | No | "Write a name." on the name |
| `activity_name_too_long` | Rename or Activity change with a name over 60 characters after normalising | 400 | No | "Use 60 characters or fewer." on the name |
| `next_change_too_long` | Review done note over 140 characters | 400 | No | "Use 140 characters or fewer." on the note |
| `category_target_out_of_range` | Target not 30 to 4800 minutes | 400 | No | "Choose 0.5 to 80 hours." on the target |
| `category_not_found` | Target for a Category that isn't mine | 400 | No | "That category is gone." and refresh |
| `activity_name_taken` | Rename to a name another Activity has (any status) | 400 | No | "You already have an Activity with that name." on the name |
| `activity_not_found` | Rename or merge with an Activity that isn't mine or is merged, or merge into itself | 400 | No | "That Activity is gone." and refresh |
| `category_already_decided` | Approve a rejected, or reject an active, Category | 400 | No | Refresh; nothing to do |
| Session lost (`PGRST301`/`PGRST303`) | Login session expired or missing | 401 | After sign-in | Keep form; UC-6 |
| No connection, timeout (10 s, judgement) | Result unknown | none | Yes, same request | "Needs a connection." Keep form (AC-2.2) |
| Server error | 5xx | 5xx | Yes | "Couldn't save. Try again." |

Overlaps are not an error: the app warns from the Local copy and saves (AC-1.2). Phone writes to Server-owned fields
are refused by column grants (403); the app never sends them.

## Auth

| Operation | Who may call | Check |
|---|---|---|
| Entry, settings, Review done, Push subscription writes | Signed-in user | RLS policies for `authenticated` only, `user_id = auth.uid()`. Insert, update, delete revoked on all `public` tables from `anon` and `authenticated`, then granted per table: `entries` select, delete, insert `id, text, started_at, ended_at, time_zone, form_opened_at`, update `text, started_at, ended_at, time_zone`; `categories` select (the target is written only through `set_category_target`); `activities` select (writes only through the rpcs); `settings` select, update `time_zone, quiet_start, quiet_end, nudge_gap_hours`; `weekly_reviews` select, insert `week_start, next_change`; `push_subscriptions` select, insert, update; `notifications_sent` none. Backend writes the SQL |
| Reads | Signed-in user | RLS and the grants above |
| `set_entry_tag`, `approve_category`, `reject_category`, `set_entry_activity`, `rename_activity`, `merge_activity`, `set_category_target`, `activity_slots` | Signed-in user | `security definer`, `set search_path = ''`, execute granted to `authenticated` only; explicit `user_id = auth.uid()` check on the Entry, Category and Activity, and on every update inside (`merge_activity` re-points only `where user_id = auth.uid() and activity_id = p_from`) |
| `tag-entries`, `send-notifications` | pg_cron and the Entry insert trigger only | `x-job-secret` equals a Server secret, which the trigger and pg_cron jobs read from Supabase Vault, never inline; JWT check off; the function uses the service role |
| Sign in | Any email | Sign-ups on; a new email gets a new, seeded account; same message either way (AC-7.2) |

## Behaviour

- **Idempotency:** create and Review done ignore duplicates by key; edit, settings, Tag change, Activity change, rename, target and the push upsert set
  the same values again; delete, approve, reject and merge are no-ops when already done. So every phone write is safe to resend
  after an unknown result (AC-2.2). Internal calls are safe to repeat (D2; `notifications_sent` key).
- **Pagination:** none. The refresh returns at most ~400 Entries, a week ~200, under the 1,000-row default limit.
- **Rate limits:** Supabase defaults; sign-in code limits are OQ-1 (backend).
- **Timeouts:** the phone waits 10 s (judgement; NFR-2 expects under 1 s); the AI call timeout is the backend stage's.

## Events and async

| Event / job | Producer | Consumers | Schema | Ordering key | Delivery |
|---|---|---|---|---|---|
| Entry inserted | AFTER INSERT trigger (`net.http_post`) | `tag-entries` | `{entry_id}` | Entry id | At most once; the Tagging check covers losses |
| Tagging check | pg_cron, 15 min; skips Entries created in the last 2 min; picks Entries missing a Tag or an Activity label (#57) | `tag-entries` | `{}` | none | Every run |
| Notification check | pg_cron, 5 min | `send-notifications` | `{}` | `(kind, about)` | At most once per Nudge or week |
| Category suggestion | `tag-entries`, after commit, new Suggested category only | Phone | Push payload | none | At most once, no retry |

## Compatibility

Greenfield, nothing to break. The app and schema ship together; schema changes are additive, and a new app version may
rebuild the Local copy. `docs/mvp-design.md` (Outbox sync) is superseded here by [D3](03-data-model.md#decisions).

## Consumer check

| Consumer | Flow | Buildable? |
|---|---|---|
| Day view and Log sheet | UC-1 create, edit, delete, resend, backfill (earlier days: the same `GET /entries` as earlier weeks) | Yes |
| App open | UC-2 refresh, time zone, Push subscription | Yes |
| Week page | UC-4 weeks, Tag change, approve/reject, Review done with its note, Category target; targets and last week's note from the Local copy; Activity totals, rename, merge (AC-5.4, AC-5.5, AC-8.3, AC-8.5) | Yes |
| Log sheet chips, Day view Activity picker | `activity_slots()` and `activities` from the Local copy; `set_entry_activity` (AC-8.2, AC-8.4) | Yes |
| Settings page | AC-6.2, AC-6.3, AC-6.4 | Yes |
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
