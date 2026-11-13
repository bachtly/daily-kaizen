-- Weekly targets per Activity, optionally narrowed to one Category, and one change for next week (#74).

create table public.activity_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade, -- null = any Category
  minutes int not null check (minutes between 30 and 4800),
  constraint activity_targets_key unique nulls not distinct (user_id, activity_id, category_id)
);
create index activity_targets_activity_idx on public.activity_targets (activity_id);

alter table public.activity_targets enable row level security;
-- reads only; writes go through set_activity_target
grant select on public.activity_targets to authenticated;
create policy activity_targets_select on public.activity_targets for select to authenticated using (user_id = auth.uid());

alter table public.weekly_reviews
  add column next_change text null,
  add constraint weekly_reviews_next_change_len check (char_length(next_change) <= 140);

-- The phone saves the note with the Review done insert.
grant insert (next_change) on public.weekly_reviews to authenticated;

-- Set or clear (null minutes) the target for an Activity, any Category when p_category_id is null.
-- Whole or half hours are the app's job; the DB bounds minutes.
create function public.set_activity_target(p_activity_id uuid, p_category_id uuid, p_minutes int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if p_minutes is not null and (p_minutes < 30 or p_minutes > 4800) then
    raise exception 'target_out_of_range';
  end if;

  perform 1 from public.activities a
    where a.id = p_activity_id and a.user_id = uid and a.status = 'active';
  if not found then
    raise exception 'activity_not_found';
  end if;
  if p_category_id is not null then
    perform 1 from public.categories c where c.id = p_category_id and c.user_id = uid;
    if not found then
      raise exception 'category_not_found';
    end if;
  end if;

  if p_minutes is null then
    delete from public.activity_targets t
      where t.user_id = uid and t.activity_id = p_activity_id and t.category_id is not distinct from p_category_id;
  else
    insert into public.activity_targets (user_id, activity_id, category_id, minutes)
      values (uid, p_activity_id, p_category_id, p_minutes)
      on conflict (user_id, activity_id, category_id) do update set minutes = excluded.minutes;
  end if;

  return jsonb_build_object('target', jsonb_build_object(
    'activity_id', p_activity_id, 'category_id', p_category_id, 'minutes', p_minutes));
end $$;

revoke execute on function public.set_activity_target(uuid, uuid, int) from public, anon;
grant execute on function public.set_activity_target(uuid, uuid, int) to authenticated;

-- Merge also moves targets (the old body is in 20261113000400_multi_activity.sql).
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
