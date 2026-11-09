begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

select is((select nudge_gap_hours from settings where user_id = '00000000-0000-0000-0000-0000000000a1'), 3::smallint, 'default is 3 hours');
select throws_ok($$update settings set nudge_gap_hours = 0$$, '23514', null, '0 is out of range');
select throws_ok($$update settings set nudge_gap_hours = 13$$, '23514', null, '13 is out of range');
select throws_like($$update settings set nudge_gap_hours = 13$$, '%nudge_gap_out_of_range%', 'the constraint is named nudge_gap_out_of_range');
select lives_ok($$update settings set nudge_gap_hours = 1 where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '1 is allowed');
select lives_ok($$update settings set nudge_gap_hours = 12 where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '12 is allowed');

-- Both users: UTC, a push subscription and the same Gap (last Entry ended 2024-11-12 08:00 UTC).
update settings set time_zone = 'UTC';
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'a', '2024-11-12 07:00+00', '2024-11-12 08:00+00', 'UTC', now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'b', '2024-11-12 07:00+00', '2024-11-12 08:00+00', 'UTC', now());
insert into push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-0000000000a1', 'https://push/a1', 'k', 'a'),
  ('00000000-0000-0000-0000-0000000000a2', 'https://push/a2', 'k', 'a');

-- a1 = 5 hours, a2 = default 3 hours: each user's own value decides.
update settings set nudge_gap_hours = 5 where user_id = '00000000-0000-0000-0000-0000000000a1';
select results_eq($$select user_id::text from claim_due_notifications('2024-11-12 11:00+00')$$,
  $$values ('00000000-0000-0000-0000-0000000000a2')$$, 'at 3 h only the default user is nudged');
select is_empty($$select * from claim_due_notifications('2024-11-12 12:59+00')$$, 'a1 at 4 h 59 (under 5 h): not yet');
select results_eq($$select user_id::text from claim_due_notifications('2024-11-12 13:00+00')$$,
  $$values ('00000000-0000-0000-0000-0000000000a1')$$, 'a1 at exactly 5 h: Nudge');

-- Changing the setting mid-Gap: still one Nudge per Gap.
update settings set nudge_gap_hours = 1 where user_id = '00000000-0000-0000-0000-0000000000a1';
select is_empty($$select * from claim_due_notifications('2024-11-12 14:00+00')$$, 'lowering the setting after the Nudge claims nothing for the same Gap');
delete from notifications_sent;
update settings set nudge_gap_hours = 12 where user_id = '00000000-0000-0000-0000-0000000000a2';
select results_eq($$select user_id::text from claim_due_notifications('2024-11-12 19:00+00')$$,
  $$values ('00000000-0000-0000-0000-0000000000a1')$$, 'a1 (1 h) nudged; a2 (12 h) not yet');

-- authenticated writes only its own row.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$update settings set nudge_gap_hours = 6$$, 'can update own nudge_gap_hours');
select lives_ok($$update settings set nudge_gap_hours = 7 where user_id = '00000000-0000-0000-0000-0000000000a2'$$, 'another user''s row is a silent no-op');
select throws_ok($$update settings set nudge_gap_hours = 99$$, '23514', null, 'out of range refused for the phone too');
reset role;
select is((select nudge_gap_hours from settings where user_id = '00000000-0000-0000-0000-0000000000a2'), 12::smallint, 'another user''s value untouched');

select * from finish();
rollback;
