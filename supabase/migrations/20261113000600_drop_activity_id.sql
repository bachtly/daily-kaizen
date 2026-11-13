-- Last step of #79: drop entries.activity_id and the one-name wrappers. Run only after the tag-entries
-- function (p_activity_names) and the app (entry_activities, set_entry_activities) are deployed.
-- Rollback: re-add the column (backfill from the first entry_activities row), restore the wrappers from
-- 20261113000400_multi_activity.sql.

drop function public.set_entry_activity(uuid, text);
drop function public.save_ai_labels(uuid, timestamptz, uuid, text, text, text);

create or replace function public.entries_clear_tag_on_text_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cat boolean := new.text is distinct from old.text and old.tag_source is distinct from 'me';
  v_act boolean := new.text is distinct from old.text and old.activity_source is distinct from 'me';
begin
  if v_cat then
    new.category_id := null;
    new.tag_source := null;
    new.tagged_at := null;
    new.suggested_category_id := null;
  end if;
  if v_act then
    new.activity_source := null;
    delete from public.entry_activities ea where ea.entry_id = old.id and ea.user_id = old.user_id;
  end if;
  if v_cat or (v_act and old.activity_source is not null) then
    new.tag_attempts := 0;
    new.tagging_gave_up_at := null;
  end if;
  return new;
end $$;

-- No more mirror into the old column. The update still touches the Entry row, so updated_at moves
-- and a tagger run that read the old state is refused.
create or replace function public.set_entry_activity_rows(p_entry_id uuid, p_user_id uuid, p_ids uuid[], p_source public.tag_source)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.entry_activities ea
    where ea.entry_id = p_entry_id and ea.user_id = p_user_id and ea.activity_id <> all (p_ids);
  insert into public.entry_activities (entry_id, activity_id, user_id)
    select p_entry_id, x, p_user_id from unnest(p_ids) as x
    on conflict do nothing;
  update public.entries e
    set activity_source = p_source
    where e.id = p_entry_id and e.user_id = p_user_id;
end $$;

create or replace function public.entry_json(p_entry_id uuid, p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
      'id', e.id, 'text', e.text, 'started_at', e.started_at, 'ended_at', e.ended_at,
      'time_zone', e.time_zone, 'category_id', e.category_id, 'tag_source', e.tag_source,
      'activity_source', e.activity_source,
      'activity_ids', coalesce((select jsonb_agg(ea.activity_id order by ea.created_at, ea.activity_id)
                                from public.entry_activities ea where ea.entry_id = e.id and ea.user_id = e.user_id), '[]'::jsonb),
      'suggested_category_id', e.suggested_category_id,
      'tagging_gave_up_at', e.tagging_gave_up_at, 'created_at', e.created_at)
  from public.entries e where e.id = p_entry_id and e.user_id = p_user_id
$$;

create or replace function public.merge_activity(p_from uuid, p_into uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_into public.activities;
  v_from public.activities;
begin
  if p_from is null or p_into is null or p_from = p_into then
    raise exception 'activity_not_found';
  end if;

  -- lock in id order so two merges cannot deadlock
  perform 1 from public.activities a
    where a.user_id = uid and a.id in (p_from, p_into) order by a.id for update;

  select * into v_into from public.activities a where a.id = p_into and a.user_id = uid;
  select * into v_from from public.activities a where a.id = p_from and a.user_id = uid;
  if v_into.id is null or v_from.id is null then
    raise exception 'activity_not_found';
  end if;

  if v_from.status = 'merged' then
    -- a repeat: from already points at into -> no change
    if v_from.merged_into_id = p_into then
      return jsonb_build_object('activity', jsonb_build_object(
        'id', v_into.id, 'name', v_into.name, 'status', v_into.status, 'merged_into_id', v_into.merged_into_id));
    end if;
    raise exception 'activity_not_found';
  end if;
  if v_into.status <> 'active' then
    raise exception 'activity_not_found';
  end if;

  insert into public.entry_activities (entry_id, activity_id, user_id)
    select ea.entry_id, p_into, ea.user_id from public.entry_activities ea
    where ea.user_id = uid and ea.activity_id = p_from
    on conflict do nothing;
  delete from public.entry_activities ea where ea.user_id = uid and ea.activity_id = p_from;
  -- targets move too; where into has its own for the same Category (or any), into's stays
  update public.activity_targets t set activity_id = p_into
    where t.user_id = uid and t.activity_id = p_from
      and not exists (select 1 from public.activity_targets o
        where o.user_id = uid and o.activity_id = p_into and o.category_id is not distinct from t.category_id);
  delete from public.activity_targets t where t.user_id = uid and t.activity_id = p_from;
  update public.activities a set merged_into_id = p_into, updated_at = now()
    where a.user_id = uid and a.merged_into_id = p_from;
  update public.activities a set status = 'merged', merged_into_id = p_into, updated_at = now()
    where a.id = p_from and a.user_id = uid;

  return jsonb_build_object('activity', jsonb_build_object(
    'id', v_into.id, 'name', v_into.name, 'status', v_into.status, 'merged_into_id', v_into.merged_into_id));
end $$;

alter table public.entries
  drop constraint entry_activity_incomplete,
  drop column activity_id; -- also drops entries_activity_idx
