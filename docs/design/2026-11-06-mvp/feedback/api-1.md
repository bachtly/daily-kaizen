# Feedback on 04-api.md, round 1

## User decisions
- Show Review done on the This week page, offline too: the Local copy refresh reads weekly_reviews from the previous Monday on. Add weekly_reviews to the Local copy in 03-data-model.md.
- Writes that set Server-owned fields (Tag change, approve, reject) are Postgres functions called through rpc; Edge Functions only for the AI, Web Push and Resend. Recorded as ADR 0005 (adr/0005-use-database-functions-for-server-owned-writes-and-edge.md). The validation choice (database checks returning named error keys) is part of this; no separate ADR.
- Quiet hours with equal start and end are invalid (quiet_hours_equal).
- Apply all fixes simply, keep the doc lean; then approve.

## Critic findings, accepted
1. Auth: revoke insert, update, delete on all tables in public from anon and authenticated, then grant per table: entries select, delete, column insert/update for my fields; categories select only; settings select plus column update; weekly_reviews select, insert; push_subscriptions select, insert, update; notifications_sent none. RLS policies target authenticated only. Backend writes the SQL.
2. Tagging trigger: a small AFTER INSERT trigger calls net.http_post with {entry_id} (no Dashboard webhook). The trigger and pg_cron jobs read the job secret from Supabase Vault, never inline. Note this in Auth.
3. Settings update: PATCH /settings?user_id=eq.<my id>.
4. Create resend: if the create returns [] (id exists), the app sends PATCH /entries?id=eq.<id> with the form's fields and shows that result.
5. Local copy: decided above.
Suggestions: the 15-minute Tagging check skips Entries created in the last 2 minutes, and tag_attempts increases only when the guarded update matches; drop last_seen_at unless something reads it (prefer drop); security definer functions use set search_path = '' and execute is granted to authenticated only; moving Entries on approval keeps tagged_at and tag_source; fix the entry_not_found row (PATCH: 200 with []; set_entry_tag: 400).

## Consistency issues, accepted
- Name the 5-minute job "Notification check" and add it to Glossary proposals; use "change an Entry's Tag" (AC-4.1) instead of "Tag correction", or add it as a glossary proposal, one name only.
- Errors table and Edit contract agree on entry_not_found (see above).
- 03-data-model.md: add the matching checks for entry_end_in_future (end not more than 5 min after now), time zone validity (IANA name), quiet_start <> quiet_end, and week_start is a Monday.
