-- An Entry has 0 to 3 Activities (#79). EXPAND step: the old entries.activity_id column and the old
-- 6-arg save_ai_labels / set_entry_activity stay and keep working (they write the new table too, and
-- activity_id mirrors the first Activity), so the deployed function and app keep working until they switch.
-- A last migration drops the old column and wrappers.
-- entries.activity_source stays per Entry: null = not labelled, 'ai' or 'me' with no rows = no Activity.
-- Rollback: drop table entry_activities, then restore the previous bodies of the replaced functions.

create table public.entry_activities (
  entry_id uuid not null references public.entries (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, activity_id)
);
create index entry_activities_activity_idx on public.entry_activities (activity_id);
create index entry_activities_user_idx on public.entry_activities (user_id);

alter table public.entry_activities enable row level security;
grant select on public.entry_activities to authenticated;
create policy entry_activities_select on public.entry_activities for select to authenticated using (user_id = auth.uid());

insert into public.entry_activities (entry_id, activity_id, user_id)
  select e.id, e.activity_id, e.user_id from public.entries e where e.activity_id is not null
  on conflict do nothing;

-- A text change clears each AI label, including its rows; a me label stays (AC-3.2, AC-3.3).
-- security definer: the phone update must be able to delete rows it has no delete grant on.
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
    new.activity_id := null;
    new.activity_source := null;
    delete from public.entry_activities ea where ea.entry_id = old.id and ea.user_id = old.user_id;
  end if;
  if v_cat or (v_act and old.activity_source is not null) then
    new.tag_attempts := 0;
    new.tagging_gave_up_at := null;
  end if;
  return new;
end $$;

-- Internal: make the Entry's Activities exactly p_ids (already resolved, deduped, at most 3) with p_source.
-- Mirrors the first one into entries.activity_id for the old readers. Always touches the Entry row, so
-- updated_at moves and a tagger run that read the old state is refused.
create function public.set_entry_activity_rows(p_entry_id uuid, p_user_id uuid, p_ids uuid[], p_source public.tag_source)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.entry_activities ea
    where ea.entry_id = p_entry_id and ea.user_id = p_user_id and ea.activity_id <> all (p_ids);
  insert into public.entry_activities (entry_id, activity_id, user_id)
    select p_entry_id, x, p_user_id from unnest(p_ids) as x
    on conflict do nothing;
  update public.entries e
    set activity_id = p_ids[1], activity_source = p_source
    where e.id = p_entry_id and e.user_id = p_user_id;
end $$;
revoke execute on function public.set_entry_activity_rows(uuid, uuid, uuid[], public.tag_source) from public, anon, authenticated;

-- Internal, for the AI: resolve each name (blank = none), drop repeats after resolving, keep the first 3.
create function public.resolve_activity_list(p_user_id uuid, p_names text[]) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[] := '{}';
  v_name text;
  v_id uuid;
begin
  foreach v_name in array coalesce(p_names, '{}') loop
    v_id := public.resolve_activity(p_user_id, v_name);
    if v_id is not null and v_id <> all (v_ids) and cardinality(v_ids) < 3 then
      v_ids := v_ids || v_id;
    end if;
  end loop;
  return v_ids;
end $$;
revoke execute on function public.resolve_activity_list(uuid, text[]) from public, anon, authenticated;

-- The Entry as the phone sees it, with its Activity ids.
create function public.entry_json(p_entry_id uuid, p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
      'id', e.id, 'text', e.text, 'started_at', e.started_at, 'ended_at', e.ended_at,
      'time_zone', e.time_zone, 'category_id', e.category_id, 'tag_source', e.tag_source,
      'activity_id', e.activity_id, 'activity_source', e.activity_source,
      'activity_ids', coalesce((select jsonb_agg(ea.activity_id order by ea.created_at, ea.activity_id)
                                from public.entry_activities ea where ea.entry_id = e.id and ea.user_id = e.user_id), '[]'::jsonb),
      'suggested_category_id', e.suggested_category_id,
      'tagging_gave_up_at', e.tagging_gave_up_at, 'created_at', e.created_at)
  from public.entries e where e.id = p_entry_id and e.user_id = p_user_id
$$;
revoke execute on function public.entry_json(uuid, uuid) from public, anon, authenticated;

-- Phone: set the Entry's Activities (0 to 3 names), source me. Null or {} = none.
-- Errors: entry_not_found; activity_name_blank (a blank or null name in the list); activity_name_too_long;
-- duplicate_activity (two names that resolve to the same Activity); too_many_activities (more than 3).
-- Repeating it changes nothing (no write, updated_at stays).
create function public.set_entry_activities(p_entry_id uuid, p_names text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_name text;
  v_clean text;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_source public.tag_source;
begin
  select e.activity_source into v_source from public.entries e
    where e.id = p_entry_id and e.user_id = uid for update;
  if not found then
    raise exception 'entry_not_found';
  end if;

  foreach v_name in array coalesce(p_names, '{}') loop
    v_clean := btrim(regexp_replace(coalesce(v_name, ''), '\s+', ' ', 'g'));
    if v_clean = '' then
      raise exception 'activity_name_blank';
    end if;
    if char_length(v_clean) > 60 then
      raise exception 'activity_name_too_long';
    end if;
  end loop;
  if cardinality(coalesce(p_names, '{}')) > 3 then
    raise exception 'too_many_activities';
  end if;

  foreach v_name in array coalesce(p_names, '{}') loop
    v_id := public.resolve_activity(uid, v_name);
    if v_id = any (v_ids) then
      raise exception 'duplicate_activity';
    end if;
    v_ids := v_ids || v_id;
  end loop;

  if v_source is distinct from 'me'
     or (select coalesce(array_agg(ea.activity_id order by ea.activity_id), '{}')
           from public.entry_activities ea where ea.entry_id = p_entry_id and ea.user_id = uid)
        is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(v_ids) as x) then
    perform public.set_entry_activity_rows(p_entry_id, uid, v_ids, 'me');
  end if;

  return jsonb_build_object('entry', public.entry_json(p_entry_id, uid));
end $$;

-- Old one-name call, kept for the deployed app: the list becomes just that name (null = none).
-- Same errors as before; it can no longer hit the new ones.
create or replace function public.set_entry_activity(p_entry_id uuid, p_name text) returns jsonb
language sql security definer set search_path = '' as $$
  select public.set_entry_activities(p_entry_id, case when p_name is null then '{}'::text[] else array[p_name] end)
$$;

-- Tagger: Category and the Activity list in one transaction. Same guard and Category part as the 6-arg
-- version; the Activity part skips a 'me' list, else saves the resolved, deduped names (first 3) with source ai.
create function public.save_ai_labels(
  p_entry_id uuid,
  p_read_updated_at timestamptz,
  p_category_id uuid,
  p_proposed_name text,
  p_proposed_description text,
  p_activity_names text[]
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_tag_source public.tag_source;
  v_act_source public.tag_source;
  v_new_id uuid;
  v_suggested uuid;
  v_status public.category_status;
  v_wrote boolean := false;
begin
  select e.user_id, e.tag_source, e.activity_source into v_user, v_tag_source, v_act_source
    from public.entries e
    where e.id = p_entry_id and e.updated_at = p_read_updated_at
    for update;
  if not found then
    return false;
  end if;

  if p_category_id is not null and v_tag_source is distinct from 'me' then
    perform 1 from public.categories c
      where c.id = p_category_id and c.user_id = v_user and c.status = 'active';
    if not found then
      raise exception 'category_not_active';
    end if;

    if p_proposed_name is not null then
      insert into public.categories (user_id, name, description, status)
        values (v_user, p_proposed_name, coalesce(p_proposed_description, ''), 'suggested')
        on conflict do nothing
        returning id into v_new_id;
      v_suggested := v_new_id;
      if v_new_id is null then
        select c.id, c.status into v_suggested, v_status from public.categories c
          where c.user_id = v_user and lower(c.name) = lower(p_proposed_name);
        if v_status is distinct from 'suggested' then
          v_suggested := null;
        end if;
      end if;
    end if;

    update public.entries e
      set category_id = p_category_id, tag_source = 'ai', tagged_at = now(),
          suggested_category_id = v_suggested
      where e.id = p_entry_id;
    v_wrote := true;
  end if;

  if v_act_source is distinct from 'me' then
    perform public.set_entry_activity_rows(p_entry_id, v_user, public.resolve_activity_list(v_user, p_activity_names), 'ai');
    v_wrote := true;
  end if;

  -- Only a save that wrote something clears the failure count.
  if v_wrote then
    update public.entries e set tag_attempts = 0, tagging_gave_up_at = null where e.id = p_entry_id;
  end if;

  return v_new_id is not null;
end $$;

-- The deployed function still sends one name: it is a list of one (null = none).
create or replace function public.save_ai_labels(
  p_entry_id uuid,
  p_read_updated_at timestamptz,
  p_category_id uuid,
  p_proposed_name text,
  p_proposed_description text,
  p_activity_name text
) returns boolean
language sql security definer set search_path = '' as $$
  select public.save_ai_labels(p_entry_id, p_read_updated_at, p_category_id, p_proposed_name, p_proposed_description,
    case when p_activity_name is null then '{}'::text[] else array[p_activity_name] end)
$$;

-- Merge: the Entries' rows move to p_into without duplicates (an Entry with both keeps one).
-- Old column mirrored too, until it is dropped.
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
  update public.entries e set activity_id = p_into
    where e.user_id = uid and e.activity_id = p_from;
  update public.activities a set merged_into_id = p_into, updated_at = now()
    where a.user_id = uid and a.merged_into_id = p_from;
  update public.activities a set status = 'merged', merged_into_id = p_into, updated_at = now()
    where a.id = p_from and a.user_id = uid;

  return jsonb_build_object('activity', jsonb_build_object(
    'id', v_into.id, 'name', v_into.name, 'status', v_into.status, 'merged_into_id', v_into.merged_into_id));
end $$;

-- Chip counts: an Entry counts once for each of its Activities.
create or replace function public.activity_slots()
returns table (activity_id uuid, dow int, hour int, n int)
language sql stable security definer set search_path = '' as $$
  select ea.activity_id,
         extract(dow from e.started_at at time zone e.time_zone)::int,
         extract(hour from e.started_at at time zone e.time_zone)::int,
         count(*)::int
  from public.entry_activities ea
  join public.entries e on e.id = ea.entry_id and e.user_id = ea.user_id
  where ea.user_id = auth.uid()
    and e.started_at >= now() - interval '12 weeks'
  group by 1, 2, 3
$$;

revoke execute on function public.set_entry_activities(uuid, text[]) from public, anon;
grant execute on function public.set_entry_activities(uuid, text[]) to authenticated;
revoke execute on function public.save_ai_labels(uuid, timestamptz, uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public.save_ai_labels(uuid, timestamptz, uuid, text, text, text[]) to service_role;
