-- RLS, revokes and grants exactly per 04-api Auth.
-- Supabase's default table grants are wide open: revoke everything, then grant per table.

alter table public.entries enable row level security;
alter table public.categories enable row level security;
alter table public.settings enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications_sent enable row level security;

revoke all on all tables in schema public from anon, authenticated;
-- Tables added later start with no rights for the app roles.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- entries: select, delete; insert and update on phone-owned columns only
grant select, delete on public.entries to authenticated;
grant insert (id, text, started_at, ended_at, time_zone, form_opened_at) on public.entries to authenticated;
grant update (text, started_at, ended_at, time_zone) on public.entries to authenticated;

grant select on public.categories to authenticated;

grant select on public.settings to authenticated;
grant update (time_zone, quiet_start, quiet_end) on public.settings to authenticated;

grant select on public.weekly_reviews to authenticated;
grant insert (week_start) on public.weekly_reviews to authenticated;

grant select on public.push_subscriptions to authenticated;
grant insert (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
grant update (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;

-- notifications_sent: no grants, no policies (service_role bypasses RLS).

-- Policies: authenticated only, own rows.
create policy entries_select on public.entries for select to authenticated using (user_id = auth.uid());
create policy entries_insert on public.entries for insert to authenticated with check (user_id = auth.uid());
create policy entries_update on public.entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entries_delete on public.entries for delete to authenticated using (user_id = auth.uid());

create policy categories_select on public.categories for select to authenticated using (user_id = auth.uid());

create policy settings_select on public.settings for select to authenticated using (user_id = auth.uid());
create policy settings_update on public.settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy weekly_reviews_select on public.weekly_reviews for select to authenticated using (user_id = auth.uid());
create policy weekly_reviews_insert on public.weekly_reviews for insert to authenticated with check (user_id = auth.uid());

create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_update on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
