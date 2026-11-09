-- Configurable Nudge gap: whole hours 1-12, default 3 (AC-6.1). The phone may write its own value;
-- claim_due_notifications() reads it instead of the fixed 3 hours.

alter table public.settings
  add column nudge_gap_hours smallint not null default 3,
  add constraint nudge_gap_out_of_range check (nudge_gap_hours between 1 and 12);

grant update (nudge_gap_hours) on public.settings to authenticated;

-- Same as 20261108000400_notifications.sql except the Nudge Gap test: s.nudge_gap_hours instead of 3 hours.
-- about is still the Gap start, so changing the setting mid-Gap never produces a second Nudge for that Gap.
create or replace function public.claim_due_notifications(p_now timestamptz default now())
returns setof public.notifications_sent
language sql security definer set search_path = '' as $$
  with due as (
    select s.user_id,
           'review_reminder'::public.notification_kind as kind,
           date_trunc('week', l.local)::date::text as about
    from public.settings s
    cross join lateral (select p_now at time zone s.time_zone as local) l
    where s.time_zone is not null
      and extract(isodow from l.local) = 7
      and l.local::time >= time '19:00'
    union all
    select s.user_id,
           'nudge'::public.notification_kind,
           to_char(g.gap_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"')
    from public.settings s
    cross join lateral (select p_now at time zone s.time_zone as local) l
    cross join lateral (select max(e.ended_at) as gap_start from public.entries e where e.user_id = s.user_id) g
    where s.time_zone is not null
      and g.gap_start is not null
      and g.gap_start <= p_now - make_interval(hours => s.nudge_gap_hours)
      and exists (select 1 from public.push_subscriptions p where p.user_id = s.user_id)
      and not (case
        when s.quiet_start > s.quiet_end then l.local::time >= s.quiet_start or l.local::time < s.quiet_end
        else l.local::time >= s.quiet_start and l.local::time < s.quiet_end
      end)
  )
  insert into public.notifications_sent (user_id, kind, about, sent_at)
  select d.user_id, d.kind, d.about, p_now from due d
  on conflict do nothing
  returning *;
$$;

-- create or replace keeps the grants; stated again so the file stands alone.
revoke execute on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;
