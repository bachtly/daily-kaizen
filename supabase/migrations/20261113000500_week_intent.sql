-- Weekly target per Category and one change for next week (#74).

alter table public.categories
  add column weekly_target_minutes int null,
  add constraint categories_weekly_target_range check (weekly_target_minutes between 30 and 4800);

alter table public.weekly_reviews
  add column next_change text null,
  add constraint weekly_reviews_next_change_len check (char_length(next_change) <= 140);

-- The phone saves the note with the Review done insert.
grant insert (next_change) on public.weekly_reviews to authenticated;

-- Set or clear (null) a Category's weekly target. Whole or half hours are the app's job; the DB bounds minutes.
create function public.set_category_target(p_category_id uuid, p_minutes int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cat public.categories;
begin
  if p_minutes is not null and (p_minutes < 30 or p_minutes > 4800) then
    raise exception 'category_target_out_of_range';
  end if;

  update public.categories c set weekly_target_minutes = p_minutes
    where c.id = p_category_id and c.user_id = uid
    returning * into cat;
  if not found then
    raise exception 'category_not_found';
  end if;

  return jsonb_build_object('category', jsonb_build_object(
    'id', cat.id, 'weekly_target_minutes', cat.weekly_target_minutes));
end $$;

revoke execute on function public.set_category_target(uuid, int) from public, anon;
grant execute on function public.set_category_target(uuid, int) to authenticated;
