-- Insights (#80, docs/design/2026-11-14-insights/design.md §3, §9).
-- week_summaries, insights, coach_notes, insight_runs. The phone reads its own rows and writes only
-- through the rpcs below; the insights Edge Function writes with service_role.

create type public.insight_status as enum ('new', 'accepted', 'dismissed');

-- One row per user-week: the facts the detectors and the AI's history read (design §4).
create table public.week_summaries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  time_zone text not null,
  as_of timestamptz not null,
  logged_days smallint not null,
  facts jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, week_start),
  constraint week_summary_not_monday check (extract(isodow from week_start) = 1),
  constraint week_summary_logged_days check (logged_days between 0 and 7)
);

-- One row per candidate the AI saw. kind + subject_key identify "the same insight" across weeks.
-- Text caps are hard limits; the function keeps AI wording shorter (design §7).
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  kind text not null,
  subject_key text not null default '',
  rank smallint not null,
  score real not null,
  facts jsonb not null,
  entry_ids uuid[] not null default '{}',
  metric jsonb not null,
  finding text not null,
  detail text not null,
  try_this text not null,
  text_source text not null,
  may_not_apply text,
  evidence jsonb not null,
  status public.insight_status not null default 'new',
  dismiss_reason text,
  acted_at timestamptz,
  active_until date,
  result jsonb,
  generated_at timestamptz not null default now(),
  constraint insight_not_monday check (extract(isodow from week_start) = 1),
  constraint insight_kind check (kind ~ '^[a-z_]{1,40}$'),
  constraint insight_rank check (rank between 1 and 8),
  constraint insight_finding_len check (char_length(finding) between 1 and 120),
  constraint insight_detail_len check (char_length(detail) between 1 and 240),
  constraint insight_try_len check (char_length(try_this) between 1 and 140),
  constraint insight_text_source check (text_source in ('ai', 'template')),
  constraint insight_may_not_apply_len check (char_length(may_not_apply) between 1 and 200),
  constraint insight_reason_len check (char_length(dismiss_reason) between 1 and 140),
  constraint insight_reason_only_dismissed check (dismiss_reason is null or status = 'dismissed'),
  constraint insight_active_until check ((active_until is not null) = (status = 'accepted')),
  constraint insight_active_until_monday check (extract(isodow from active_until) = 1),
  constraint insights_key unique (user_id, week_start, kind, subject_key)
);
-- One accepted change per week (D12).
create unique index insights_one_accepted on public.insights (user_id, week_start) where status = 'accepted';
create index insights_running_idx on public.insights (active_until) where status = 'accepted';

-- Append-only versions; the newest row is the current note. '' = cleared.
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  source public.tag_source not null,
  week_start date,
  created_at timestamptz not null default clock_timestamp(),
  constraint coach_note_len check (char_length(body) <= 1200)
);
create index coach_notes_user_created_idx on public.coach_notes (user_id, created_at desc);

-- One row per generation attempt: rate limit for on-demand runs, retries, debugging.
create table public.insight_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  trigger text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  model text,
  input_tokens int,
  output_tokens int,
  error text,
  constraint insight_run_trigger check (trigger in ('schedule', 'me')),
  constraint insight_run_status check (status in ('running', 'ok', 'too_early', 'ai_failed'))
);
create index insight_runs_user_started_idx on public.insight_runs (user_id, started_at desc);

-- RLS: the phone selects its own rows; insight_runs has no phone access.
alter table public.week_summaries enable row level security;
alter table public.insights enable row level security;
alter table public.coach_notes enable row level security;
alter table public.insight_runs enable row level security;

grant select on public.week_summaries, public.insights, public.coach_notes to authenticated;
create policy week_summaries_select on public.week_summaries for select to authenticated using (user_id = auth.uid());
create policy insights_select on public.insights for select to authenticated using (user_id = auth.uid());
create policy coach_notes_select on public.coach_notes for select to authenticated using (user_id = auth.uid());

-- Monday of the user's current week in their latest reported time zone (UTC while none).
-- Internal: called by the rpcs below.
create function public.local_monday(p_user_id uuid) returns date
language sql stable security definer set search_path = '' as $$
  select date_trunc('week', now() at time zone coalesce(
    (select s.time_zone from public.settings s where s.user_id = p_user_id), 'UTC'))::date;
$$;

-- The insight as the phone stores it.
create function public.insight_json(p_id uuid, p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', i.id, 'week_start', i.week_start, 'status', i.status,
      'dismiss_reason', i.dismiss_reason, 'acted_at', i.acted_at, 'active_until', i.active_until)
    from public.insights i where i.id = p_id and i.user_id = p_user_id;
$$;

-- Lock one of my insights; another user's looks missing.
create function public.lock_insight(p_id uuid, p_user_id uuid) returns public.insights
language plpgsql security definer set search_path = '' as $$
declare
  v public.insights;
begin
  select * into v from public.insights i where i.id = p_id and i.user_id = p_user_id for update;
  if v.id is null then
    raise exception 'insight_not_found';
  end if;
  return v;
end $$;

-- Make it next week's change. Only this week's or last week's insights; replaces another accepted
-- card of the same week. The change runs the week after the insight's week (active_until).
create function public.accept_insight(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v public.insights := public.lock_insight(p_id, auth.uid());
begin
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

-- Not useful, with an optional reason (trimmed, 1-140 chars; blank = none). Calling it again on a
-- dismissed card sets or changes the reason; a null reason keeps the one it has.
create function public.dismiss_insight(p_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v public.insights := public.lock_insight(p_id, auth.uid());
  v_reason text := nullif(btrim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g')), '');
begin
  if char_length(v_reason) > 140 then
    raise exception 'reason_too_long';
  end if;

  update public.insights i
    set status = 'dismissed',
        acted_at = case when v.status = 'dismissed' then i.acted_at else now() end,
        active_until = null,
        dismiss_reason = coalesce(v_reason, i.dismiss_reason)
    where i.id = p_id and i.user_id = uid
      and (i.status <> 'dismissed' or (v_reason is not null and v_reason is distinct from i.dismiss_reason));

  return jsonb_build_object('insight', public.insight_json(p_id, uid));
end $$;

-- Undo a dismiss or an accept: back to new.
create function public.undo_insight(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v public.insights := public.lock_insight(p_id, auth.uid());
begin
  update public.insights i
    set status = 'new', acted_at = null, active_until = null, dismiss_reason = null
    where i.id = p_id and i.user_id = uid and i.status <> 'new';
  return jsonb_build_object('insight', public.insight_json(p_id, uid));
end $$;

-- Keep the running change one more week. Only while it runs this week; repeating it changes nothing.
create function public.keep_change(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v public.insights := public.lock_insight(p_id, auth.uid());
  v_monday date := public.local_monday(auth.uid());
begin
  if v.status <> 'accepted' or v.active_until not in (v_monday, v_monday + 7) then
    raise exception 'change_not_running';
  end if;
  update public.insights i set active_until = v_monday + 7
    where i.id = p_id and i.user_id = uid and i.active_until = v_monday;
  return jsonb_build_object('insight', public.insight_json(p_id, uid));
end $$;

-- My version of the coach note (trimmed; '' clears it). Lines I write stay word for word (design §7).
create function public.set_coach_note(p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_row public.coach_notes;
begin
  if char_length(v_body) > 1200 then
    raise exception 'note_too_long';
  end if;
  insert into public.coach_notes (user_id, body, source, week_start)
    values (uid, v_body, 'me', public.local_monday(uid))
    returning * into v_row;
  return jsonb_build_object('note', jsonb_build_object(
    'id', v_row.id, 'body', v_row.body, 'source', v_row.source, 'created_at', v_row.created_at));
end $$;

-- Job helper: replace a week's cards I haven't acted on, keep the rest. p_cards is a jsonb array of
-- insights rows (without id, user_id, week_start, status). Returns the number of cards inserted.
create function public.save_insights(p_user_id uuid, p_week_start date, p_cards jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  delete from public.insights i
    where i.user_id = p_user_id and i.week_start = p_week_start and i.status = 'new';
  insert into public.insights (user_id, week_start, kind, subject_key, rank, score, facts, entry_ids, metric,
      finding, detail, try_this, text_source, may_not_apply, evidence)
    select p_user_id, p_week_start, c.kind, coalesce(c.subject_key, ''), c.rank, c.score, c.facts,
           coalesce(c.entry_ids, '{}'), c.metric, c.finding, c.detail, c.try_this, c.text_source,
           c.may_not_apply, c.evidence
      from jsonb_to_recordset(p_cards) as c(kind text, subject_key text, rank smallint, score real, facts jsonb,
           entry_ids uuid[], metric jsonb, finding text, detail text, try_this text, text_source text,
           may_not_apply text, evidence jsonb)
    on conflict (user_id, week_start, kind, subject_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.local_monday(uuid) from public, anon, authenticated;
revoke execute on function public.insight_json(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.lock_insight(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.accept_insight(uuid) from public, anon;
revoke execute on function public.dismiss_insight(uuid, text) from public, anon;
revoke execute on function public.undo_insight(uuid) from public, anon;
revoke execute on function public.keep_change(uuid) from public, anon;
revoke execute on function public.set_coach_note(text) from public, anon;
revoke execute on function public.save_insights(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.accept_insight(uuid) to authenticated;
grant execute on function public.dismiss_insight(uuid, text) to authenticated;
grant execute on function public.undo_insight(uuid) to authenticated;
grant execute on function public.keep_change(uuid) to authenticated;
grant execute on function public.set_coach_note(text) to authenticated;
grant execute on function public.save_insights(uuid, date, jsonb) to service_role;
