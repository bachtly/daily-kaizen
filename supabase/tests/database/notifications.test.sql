begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- Dates are in 2024 so Entries are never "in the future" for the real clock.
-- 2024-11-10 is a Sunday (week starts Monday 2024-11-04); 2024-03-31 is a Sunday (Berlin DST starts).
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a1');

select is((select count(*)::int from pg_proc where proname = 'claim_due_notifications'
  and has_function_privilege('service_role', oid, 'execute')
  and not has_function_privilege('authenticated', oid, 'execute')
  and not has_function_privilege('anon', oid, 'execute')
  and prosecdef and proconfig = array['search_path=""']), 1, 'service_role only, security definer, empty search_path');

select lives_ok($$select * from claim_due_notifications()$$, 'the no-argument call resolves');

-- Review reminder -----------------------------------------------------------
select is_empty($$select * from claim_due_notifications('2024-11-10 20:00+00')$$, 'null time zone: nothing due');

update settings set time_zone = 'Asia/Ho_Chi_Minh';
select is_empty($$select * from claim_due_notifications('2024-11-10 11:59+00')$$, 'Sunday 18:59 local: not yet');
select results_eq($$select user_id::text, kind::text, about from claim_due_notifications('2024-11-10 12:00+00')$$,
  $$values ('00000000-0000-0000-0000-0000000000a1', 'review_reminder', '2024-11-04')$$, 'Sunday 19:00 local: reminder about the local Monday');
select is_empty($$select * from claim_due_notifications('2024-11-10 12:05+00')$$, 'double claim claims nothing');
select is((select sent_at from notifications_sent), '2024-11-10 12:00+00'::timestamptz, 'sent_at is the claim time');

delete from notifications_sent;
select is_empty($$select * from claim_due_notifications('2024-11-10 17:00+00')$$, 'Monday 00:00 local: reminder skipped after Sunday 23:59');
select is_empty($$select * from claim_due_notifications('2024-11-09 14:00+00')$$, 'Saturday evening: nothing');

update settings set time_zone = 'America/Los_Angeles';
select is_empty($$select * from claim_due_notifications('2024-11-11 02:59+00')$$, 'LA Sunday 18:59 local: not yet');
select results_eq($$select kind::text, about from claim_due_notifications('2024-11-11 03:00+00')$$,
  $$values ('review_reminder', '2024-11-04')$$, 'LA Sunday 19:00 local (Monday in UTC): due');

delete from notifications_sent;
update settings set time_zone = 'Europe/Berlin';
select is_empty($$select * from claim_due_notifications('2024-03-31 16:59+00')$$, 'Berlin DST start day, 18:59 CET-summer: not yet');
select results_eq($$select kind::text, about from claim_due_notifications('2024-03-31 17:00+00')$$,
  $$values ('review_reminder', '2024-03-25')$$, 'Berlin DST start day: 17:00 UTC is 19:00 local');

-- Nudge ------------------------------------------------------------------------
delete from notifications_sent;
update settings set time_zone = 'UTC';
select is_empty($$select * from claim_due_notifications('2024-11-12 12:00+00')$$, 'no Entries: no Gap, no Nudge');

insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'a', '2024-11-12 07:00+00', '2024-11-12 08:00+00', 'UTC', now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'older', '2024-11-12 05:00+00', '2024-11-12 06:00+00', 'UTC', now());
select is_empty($$select * from claim_due_notifications('2024-11-12 12:00+00')$$, 'no push subscription: no Nudge');

insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000a1', 'https://push/x', 'k', 'a');
select is_empty($$select * from claim_due_notifications('2024-11-12 10:59+00')$$, 'Gap 2 h 59: not yet');
select results_eq($$select kind::text, about from claim_due_notifications('2024-11-12 11:00+00')$$,
  $$values ('nudge', '2024-11-12T08:00:00.000000+00:00')$$, 'Gap exactly 3 h: Nudge about the latest ended_at');
select is_empty($$select * from claim_due_notifications('2024-11-12 11:30+00')$$, 'one Nudge per Gap');

-- A later Entry starts a new Gap. Quiet hours 23:00-07:00 wrap midnight.
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'b', '2024-11-12 19:00+00', '2024-11-12 20:00+00', 'UTC', now());
select is_empty($$select * from claim_due_notifications('2024-11-12 22:59+00')$$, 'new Gap 2 h 59: not yet');
select is_empty($$select * from claim_due_notifications('2024-11-12 23:00+00')$$, 'Quiet hours start (inclusive): no Nudge');
select is_empty($$select * from claim_due_notifications('2024-11-13 02:00+00')$$, 'inside wrapped Quiet hours after midnight: no Nudge');
select is_empty($$select * from claim_due_notifications('2024-11-13 06:59+00')$$, 'just before Quiet hours end: no Nudge');
select results_eq($$select kind::text, about from claim_due_notifications('2024-11-13 07:00+00')$$,
  $$values ('nudge', '2024-11-12T20:00:00.000000+00:00')$$, 'Quiet hours end (exclusive): Nudge goes out, once');

select is((select max(about::timestamptz) from notifications_sent where kind = 'nudge'), '2024-11-12 20:00+00'::timestamptz, 'Nudge about parses back to the same instant');

-- Non-wrapping Quiet hours
delete from notifications_sent;
update settings set quiet_start = '13:00', quiet_end = '15:00';
select is_empty($$select * from claim_due_notifications('2024-11-13 14:00+00')$$, 'inside non-wrapping Quiet hours: no Nudge');
select is((select count(*)::int from claim_due_notifications('2024-11-13 15:00+00')), 1, 'Quiet hours end 15:00: Nudge');

-- Local time zone decides Quiet hours
delete from notifications_sent;
update settings set quiet_start = '23:00', quiet_end = '07:00', time_zone = 'Asia/Ho_Chi_Minh';
select is_empty($$select * from claim_due_notifications('2024-11-13 16:00+00')$$, '23:00 local in Ho Chi Minh is Quiet');
select is((select count(*)::int from claim_due_notifications('2024-11-13 00:00+00')), 1, '07:00 local in Ho Chi Minh is not Quiet');

-- Deleting the latest Entry moves the Gap start back; its Nudge row stays, so no repeat for an older Gap start
delete from notifications_sent;
delete from entries where id = '00000000-0000-0000-0000-000000000003';
select results_eq($$select about from claim_due_notifications('2024-11-13 00:00+00')$$,
  $$values ('2024-11-12T08:00:00.000000+00:00')$$, 'Gap start moves back after the latest Entry is deleted');

-- Both kinds at once, and the claim is atomic per user/kind
delete from notifications_sent;
update settings set time_zone = 'UTC';
delete from entries;
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'sun', '2024-11-10 08:00+00', '2024-11-10 09:00+00', 'UTC', now());
select results_eq($$select kind::text from claim_due_notifications('2024-11-10 19:30+00') order by kind$$,
  $$values ('nudge'), ('review_reminder')$$, 'a Nudge and a Review reminder can be due together');
select is((select count(*)::int from notifications_sent), 2, 'both recorded');
select is_empty($$select * from claim_due_notifications('2024-11-10 19:30+00')$$, 'repeat claims nothing');

-- No settings time zone again: nothing
delete from notifications_sent;
update settings set time_zone = null;
select is_empty($$select * from claim_due_notifications('2024-11-10 19:30+00')$$, 'time zone cleared: nothing due');

select * from finish();
rollback;
