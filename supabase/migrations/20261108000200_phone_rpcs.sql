-- Phone rpcs per 04-api Contracts: set_entry_tag, approve_category, reject_category.
-- security definer + search_path = '' with explicit auth.uid() checks; execute for authenticated only.

create function public.set_entry_tag(entry_id uuid, category_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  perform 1 from public.entries e where e.id = entry_id and e.user_id = uid for update;
  if not found then
    raise exception 'entry_not_found';
  end if;
  perform 1 from public.categories c
    where c.id = category_id and c.user_id = uid and c.status = 'active';
  if not found then
    raise exception 'category_not_active';
  end if;

  update public.entries e
    set category_id = set_entry_tag.category_id, tag_source = 'me', tagged_at = now()
    where e.id = entry_id
    returning jsonb_build_object('entry', jsonb_build_object(
      'id', e.id, 'text', e.text, 'started_at', e.started_at, 'ended_at', e.ended_at,
      'time_zone', e.time_zone, 'category_id', e.category_id, 'tag_source', e.tag_source,
      'suggested_category_id', e.suggested_category_id,
      'tagging_gave_up_at', e.tagging_gave_up_at, 'created_at', e.created_at))
    into result;
  return result;
end $$;

-- Approve a Suggested category: it becomes active and moves the Entries that suggested it,
-- except those tagged by me, keeping their tagged_at and tag_source (AC-4.2). Repeats are no-ops.
create function public.approve_category(category_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cat public.categories;
  moved uuid[] := '{}';
begin
  select * into cat from public.categories c
    where c.id = category_id and c.user_id = uid for update;
  if not found then
    raise exception 'category_not_active';
  end if;
  if cat.status = 'rejected' then
    raise exception 'category_already_decided';
  end if;

  if cat.status = 'suggested' then
    update public.categories c set status = 'active' where c.id = cat.id
      returning * into cat;
    with moved_rows as (
      update public.entries e set category_id = cat.id
        where e.user_id = uid and e.suggested_category_id = cat.id and e.tag_source = 'ai'
        returning e.id)
    select coalesce(array_agg(id), '{}') into moved from moved_rows;
  end if;

  return jsonb_build_object(
    'category', jsonb_build_object('id', cat.id, 'name', cat.name,
      'description', cat.description, 'status', cat.status),
    'moved_entry_ids', to_jsonb(moved));
end $$;

-- Reject a Suggested category; Tags and suggested_category_id stay (AC-4.3). Repeats are no-ops.
create function public.reject_category(category_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cat public.categories;
begin
  select * into cat from public.categories c
    where c.id = category_id and c.user_id = uid for update;
  if not found then
    raise exception 'category_not_active';
  end if;
  if cat.status = 'active' then
    raise exception 'category_already_decided';
  end if;

  if cat.status = 'suggested' then
    update public.categories c set status = 'rejected' where c.id = cat.id
      returning * into cat;
  end if;

  return jsonb_build_object(
    'category', jsonb_build_object('id', cat.id, 'name', cat.name,
      'description', cat.description, 'status', cat.status),
    'moved_entry_ids', '[]'::jsonb);
end $$;

revoke execute on function public.set_entry_tag(uuid, uuid) from public, anon;
revoke execute on function public.approve_category(uuid) from public, anon;
revoke execute on function public.reject_category(uuid) from public, anon;
grant execute on function public.set_entry_tag(uuid, uuid) to authenticated;
grant execute on function public.approve_category(uuid) to authenticated;
grant execute on function public.reject_category(uuid) to authenticated;
