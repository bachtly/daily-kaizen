-- Ad-hoc insights (#80): up to 5 findings the AI spots itself in the week's data, after the up to 8 cards
-- from fixed checks. They have nothing code can measure (metric {"fn":"none"}), so one can't be next
-- week's change.
alter table public.insights drop constraint insight_rank;
alter table public.insights add constraint insight_rank check (rank between 1 and 13);

create or replace function public.accept_insight(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v public.insights := public.lock_insight(p_id, auth.uid());
begin
  if v.kind = 'adhoc' then
    raise exception 'insight_not_measurable';
  end if;
  if v.week_start < public.local_monday(uid) - 7 then
    raise exception 'insight_too_old';
  end if;
  if v.status = 'accepted' then
    return jsonb_build_object('insight', public.insight_json(p_id, uid), 'replaced', null);
  end if;

  update public.insights i
    set status = 'new', acted_at = null, active_until = null
    where i.user_id = uid and i.week_start = v.week_start and i.status = 'accepted';

  update public.insights i
    set status = 'accepted', acted_at = now(), active_until = v.week_start + 7, dismiss_reason = null
    where i.id = p_id and i.user_id = uid;

  return jsonb_build_object('insight', public.insight_json(p_id, uid));
end $$;
