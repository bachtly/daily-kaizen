-- Phone rpcs for Activities (#57) per 04-api: set_entry_activity, rename_activity, merge_activity, activity_slots.
-- security definer + search_path = '' with explicit auth.uid() checks; execute for authenticated only.

-- Change an Entry's Activity: resolve the name (04-api / 03-data-model), source me. Null or blank = none.
-- Repeating it changes nothing (no write, so updated_at stays).
create function public.set_entry_activity(p_entry_id uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_activity uuid;
  result jsonb;
begin
  perform 1 from public.entries e where e.id = p_entry_id and e.user_id = uid for update;
  if not found then
    raise exception 'entry_not_found';
  end if;

  v_activity := public.resolve_activity(uid, p_name);

  update public.entries e
    set activity_id = v_activity, activity_source = 'me'
    where e.id = p_entry_id and e.user_id = uid
      and (e.activity_id is distinct from v_activity or e.activity_source is distinct from 'me');

  select jsonb_build_object(
      'id', e.id, 'text', e.text, 'started_at', e.started_at, 'ended_at', e.ended_at,
      'time_zone', e.time_zone, 'category_id', e.category_id, 'tag_source', e.tag_source,
      'activity_id', e.activity_id, 'activity_source', e.activity_source,
      'suggested_category_id', e.suggested_category_id,
      'tagging_gave_up_at', e.tagging_gave_up_at, 'created_at', e.created_at)
    into result
    from public.entries e where e.id = p_entry_id and e.user_id = uid;
  return jsonb_build_object('entry', result);
end $$;

-- Rename an Active Activity. Same normaliser as resolve_activity (trim, collapse spaces).
create function public.rename_activity(p_id uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  act public.activities;
begin
  select * into act from public.activities a
    where a.id = p_id and a.user_id = uid and a.status = 'active' for update;
  if not found then
    raise exception 'activity_not_found';
  end if;
  if v_name = '' then
    raise exception 'activity_name_taken';
  end if;

  if act.name is distinct from v_name then
    perform 1 from public.activities a
      where a.user_id = uid and a.id <> p_id and lower(btrim(a.name)) = lower(v_name);
    if found then
      raise exception 'activity_name_taken';
    end if;
    begin
      update public.activities a set name = v_name, updated_at = now()
        where a.id = p_id and a.user_id = uid
        returning * into act;
    exception when unique_violation then
      raise exception 'activity_name_taken';
    end;
  end if;

  return jsonb_build_object('activity', jsonb_build_object(
    'id', act.id, 'name', act.name, 'status', act.status, 'merged_into_id', act.merged_into_id));
end $$;

-- Merge p_from into p_into: my Entries move, earlier aliases of p_from re-point, p_from becomes merged.
-- Repeating a done merge is a no-op returning the target.
create function public.merge_activity(p_from uuid, p_into uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_from public.activities;
  v_into public.activities;
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

  update public.entries e set activity_id = p_into
    where e.user_id = uid and e.activity_id = p_from;
  update public.activities a set merged_into_id = p_into, updated_at = now()
    where a.user_id = uid and a.merged_into_id = p_from;
  update public.activities a set status = 'merged', merged_into_id = p_into, updated_at = now()
    where a.id = p_from and a.user_id = uid;

  return jsonb_build_object('activity', jsonb_build_object(
    'id', v_into.id, 'name', v_into.name, 'status', v_into.status, 'merged_into_id', v_into.merged_into_id));
end $$;

-- Chip counts: my Entries with an Activity over the last 12 weeks, by weekday (0 = Sunday, as Postgres
-- extract(dow)) and hour of the start in each Entry's own time zone.
create function public.activity_slots()
returns table (activity_id uuid, dow int, hour int, n int)
language sql stable security definer set search_path = '' as $$
  select e.activity_id,
         extract(dow from e.started_at at time zone e.time_zone)::int,
         extract(hour from e.started_at at time zone e.time_zone)::int,
         count(*)::int
  from public.entries e
  where e.user_id = auth.uid()
    and e.activity_id is not null
    and e.started_at >= now() - interval '12 weeks'
  group by 1, 2, 3
$$;

revoke execute on function public.set_entry_activity(uuid, text) from public, anon;
revoke execute on function public.rename_activity(uuid, text) from public, anon;
revoke execute on function public.merge_activity(uuid, uuid) from public, anon;
revoke execute on function public.activity_slots() from public, anon;
grant execute on function public.set_entry_activity(uuid, text) to authenticated;
grant execute on function public.rename_activity(uuid, text) to authenticated;
grant execute on function public.merge_activity(uuid, uuid) to authenticated;
grant execute on function public.activity_slots() to authenticated;
