-- Activity names (#71 DB part, #73): blank and too-long names get their own errors; at most 60 characters.
-- Rollback: drop the constraint and restore the previous bodies of resolve_activity, set_entry_activity, rename_activity.

-- Existing names cut first so the check can be added.
-- Collision-safe: among names with the same cut, a plain (<= 60) name goes first, then oldest; rank 1 gets the
-- plain cut, the rest get a number ("... 2") so activities_user_name_key still holds.
create function public.cut_long_activity_names() returns void language sql as $$
with ranked as (
  select a.id, char_length(a.name) > 60 as is_long,
         row_number() over (partition by a.user_id, lower(btrim(left(a.name, 60)))
                            order by (char_length(a.name) > 60), a.created_at, a.id) as rn
  from public.activities a
)
update public.activities a
  set name = case when r.rn = 1 then btrim(left(a.name, 60))
                  else btrim(left(a.name, 56)) || ' ' || r.rn end
  from ranked r
  where r.id = a.id and r.is_long;
$$;
revoke execute on function public.cut_long_activity_names() from public, anon, authenticated;
select public.cut_long_activity_names();

alter table public.activities add constraint activity_name_too_long check (char_length(name) <= 60);

-- AI and phone share this. An AI name longer than 60 is cut (the AI path never fails on it);
-- the phone rpcs reject long names before calling it.
create or replace function public.resolve_activity(p_user_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60));
  v_id uuid;
  v_next uuid;
  v_hops int := 0;
begin
  if v_name = '' then
    return null;
  end if;
  select a.id, a.merged_into_id into v_id, v_next from public.activities a
    where a.user_id = p_user_id and lower(btrim(a.name)) = lower(v_name);
  if v_id is null then
    insert into public.activities (user_id, name) values (p_user_id, v_name)
      on conflict (user_id, lower(btrim(name))) do nothing
      returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
    -- lost a race: read the winner
    select a.id, a.merged_into_id into v_id, v_next from public.activities a
      where a.user_id = p_user_id and lower(btrim(a.name)) = lower(v_name);
  end if;
  while v_next is not null and v_hops < 20 loop
    v_id := v_next;
    select a.merged_into_id into v_next from public.activities a where a.id = v_id;
    v_hops := v_hops + 1;
  end loop;
  return v_id;
end $$;

-- Null name = no Activity. A name that is blank after trimming raises activity_name_blank;
-- one over 60 characters raises activity_name_too_long.
-- Source is always 'me': 'me' with a null id means "I chose no Activity", unlike 'ai' with a null id.
create or replace function public.set_entry_activity(p_entry_id uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_activity uuid;
  result jsonb;
begin
  perform 1 from public.entries e where e.id = p_entry_id and e.user_id = uid for update;
  if not found then
    raise exception 'entry_not_found';
  end if;
  if p_name is not null and v_name = '' then
    raise exception 'activity_name_blank';
  end if;
  if char_length(v_name) > 60 then
    raise exception 'activity_name_too_long';
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

create or replace function public.rename_activity(p_id uuid, p_name text) returns jsonb
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
    raise exception 'activity_name_blank';
  end if;
  if char_length(v_name) > 60 then
    raise exception 'activity_name_too_long';
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
