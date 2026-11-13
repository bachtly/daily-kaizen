-- Activities (#57): a second label on each Entry, separate from Category.
-- Writes go through RPCs (later migration) and service_role helpers; the phone only reads.

create type public.activity_status as enum ('active', 'merged');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  status public.activity_status not null default 'active',
  merged_into_id uuid references public.activities (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_name_empty check (btrim(name) <> ''),
  constraint activity_merged_target check ((status = 'merged') = (merged_into_id is not null))
);
create unique index activities_user_name_key on public.activities (user_id, lower(btrim(name)));
create index activities_merged_into_idx on public.activities (merged_into_id);

alter table public.activities enable row level security;
-- default privileges already give the app roles nothing on new tables
grant select on public.activities to authenticated;
create policy activities_select on public.activities for select to authenticated using (user_id = auth.uid());

-- activity_source null = not labelled yet; 'ai' with a null id = the AI found no activity.
alter table public.entries
  add column activity_id uuid references public.activities (id) on delete restrict,
  add column activity_source public.tag_source,
  add constraint entry_activity_incomplete check (activity_id is null or activity_source is not null);
create index entries_activity_idx on public.entries (activity_id);

-- A text change clears each AI label; a me label stays (AC-3.2, AC-3.3).
create or replace function public.entries_clear_tag_on_text_edit() returns trigger
language plpgsql set search_path = '' as $$
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
  end if;
  if v_cat or (v_act and old.activity_source is not null) then
    new.tag_attempts := 0;
    new.tagging_gave_up_at := null;
  end if;
  return new;
end $$;

-- Name resolution, shared by the AI and the phone: normalise, match an Active name
-- (any case), follow a merged name to the end of its chain, else insert Active.
-- Blank name -> null. Internal: no grants, callers are security definer.
create function public.resolve_activity(p_user_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
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

-- Replaces save_ai_tag for the tagger: Category and Activity in one transaction.
-- Guard first (a miss writes nothing); each part is skipped when its source is 'me'.
-- p_category_id null = leave the Category alone. Returns true when a new Suggested category was inserted.
create function public.save_ai_labels(
  p_entry_id uuid,
  p_read_updated_at timestamptz,
  p_category_id uuid,
  p_proposed_name text,
  p_proposed_description text,
  p_activity_name text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_tag_source public.tag_source;
  v_act_source public.tag_source;
  v_new_id uuid;
  v_suggested uuid;
  v_status public.category_status;
  v_activity uuid;
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
    v_activity := public.resolve_activity(v_user, p_activity_name);
    update public.entries e
      set activity_id = v_activity, activity_source = 'ai'
      where e.id = p_entry_id;
    v_wrote := true;
  end if;

  -- Only a save that wrote something clears the failure count.
  if v_wrote then
    update public.entries e set tag_attempts = 0, tagging_gave_up_at = null where e.id = p_entry_id;
  end if;

  return v_new_id is not null;
end $$;

revoke execute on function public.resolve_activity(uuid, text) from public, anon, authenticated;
revoke execute on function public.save_ai_labels(uuid, timestamptz, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_ai_labels(uuid, timestamptz, uuid, text, text, text) to service_role;
