-- claim_due_notifications(): decides what is due (all local-time logic, 06-backend Time-zone conversion),
-- records it in notifications_sent first and returns only the rows it claimed.
-- Internal: service_role only. p_now exists so tests can fix the clock; callers pass nothing.
--
-- Review reminder: local Sunday from 19:00 (Sunday ending at 24:00 is the "skipped after 23:59" rule);
--   about = the local week's Monday, YYYY-MM-DD.
-- Nudge: a push subscription exists, the Gap (latest ended_at) is at least 3 h old, and the local time
--   is outside Quiet hours (wrap-aware, start inclusive, end exclusive); about = Gap start as an ISO
--   timestamp with offset (UTC). No Entries means no Gap.
-- Nothing is due while settings.time_zone is null. A second call claims nothing new (PK conflict).

create function public.claim_due_notifications(p_now timestamptz default now())
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
      and g.gap_start <= p_now - interval '3 hours'
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

revoke execute on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;
