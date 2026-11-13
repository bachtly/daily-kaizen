-- Activities switch-on (#57, AC-8.6): the Tagging check also picks Entries with no Activity label yet,
-- so new and existing Entries are labelled by the normal check. Oldest first, max 20, over 2 min old, not given up.
-- Deploy tag-entries (fn-activities) first: the old function never sets an Activity, so every Entry would stay due.
-- Rollback: restore the previous body (where e.category_id is null ...).
create or replace function public.untagged_due() returns setof public.entries
language sql stable security definer set search_path = '' as $$
  select * from public.entries e
  where (e.category_id is null or e.activity_source is null)
    and e.tagging_gave_up_at is null
    and e.created_at < now() - interval '2 minutes'
  order by e.created_at
  limit 20;
$$;

create index entries_activity_due_idx on public.entries (created_at)
  where activity_source is null and tagging_gave_up_at is null;

-- save_ai_labels replaced it and nothing calls it any more.
drop function public.save_ai_tag(uuid, timestamptz, uuid, text, text);
