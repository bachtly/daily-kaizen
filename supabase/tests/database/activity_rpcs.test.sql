begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

-- Fixtures as postgres. a1: Alpha, Beta (active), Gamma (merged into Beta), Delta (active). a2: Theirs, Other.
insert into activities (id, user_id, name, status, merged_into_id) values
  ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a1', 'Alpha', 'active', null),
  ('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-0000000000a1', 'Beta', 'active', null),
  ('00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a2', 'Theirs', 'active', null),
  ('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-0000000000a2', 'Other', 'active', null),
  ('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-0000000000a1', 'Delta', 'active', null);
insert into activities (id, user_id, name, status, merged_into_id) values
  ('00000000-0000-0000-0000-00000000ac05', '00000000-0000-0000-0000-0000000000a1', 'Gamma', 'merged', '00000000-0000-0000-0000-00000000ac02');

-- e1: a1 Alpha (ai). e2: a1 Alpha (me). e3: a1 none. e4, e5: a2 Theirs.
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_source) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'e1', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), 'ai'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'e2', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), 'me'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'e3', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), null),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a2', 'e4', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), 'ai'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a2', 'e5', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), 'ai');
insert into entry_activities (entry_id, activity_id, user_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a2');

-- anon cannot execute
set local role anon;
select throws_ok($$select activity_slots()$$, '42501', null, 'anon cannot call activity_slots');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- rename_activity
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', '  Alpha   One ') -> 'activity' ->> 'name'), 'Alpha One', 'rename normalises');
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', 'alpha one') -> 'activity' ->> 'name'), 'alpha one', 'case-only rename is allowed');
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', 'alpha one') -> 'activity' ->> 'name'), 'alpha one', 'same name again is a no-op');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', 'BETA')$$, 'P0001', 'activity_name_taken', 'clash with an Active name');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', 'gamma')$$, 'P0001', 'activity_name_taken', 'clash with a merged name');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac05', 'Gamma 2')$$, 'P0001', 'activity_not_found', 'merged Activity cannot be renamed');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac03', 'Mine')$$, 'P0001', 'activity_not_found', 'another user''s Activity looks missing');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', '   ')$$, 'P0001', 'activity_name_blank', 'blank rename');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', repeat('x', 61))$$, 'P0001', 'activity_name_too_long', 'rename over 60');
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', repeat('y', 60)) -> 'activity' ->> 'name'), repeat('y', 60), 'rename of exactly 60 is allowed');
reset role;
create temp table cut_ra as select resolve_activity('00000000-0000-0000-0000-0000000000a1', repeat('w', 70)) as id;
select is((select name from activities where id = (select id from cut_ra)), repeat('w', 60), 'AI name over 60 is cut to 60');
select throws_ok($$update activities set name = repeat('v', 61) where id = '00000000-0000-0000-0000-00000000ac06'$$, '23514', null, 'check blocks names over 60');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- merge_activity: a1 merges Alpha into Beta
select is((select merge_activity('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac02') -> 'activity' ->> 'id'), '00000000-0000-0000-0000-00000000ac02', 'merge returns the target');
select is((select count(*)::int from entry_activities where activity_id = '00000000-0000-0000-0000-00000000ac02'), 2, 'my Entries moved to the target');
select is((select activity_source::text from entries where id = '00000000-0000-0000-0000-000000000002'), 'me', 'moved Entry keeps its source');
select is((select status::text || merged_into_id::text from activities where id = '00000000-0000-0000-0000-00000000ac01'), 'merged00000000-0000-0000-0000-00000000ac02', 'from is merged into target');
select is((select merge_activity('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac02') -> 'activity' ->> 'id'), '00000000-0000-0000-0000-00000000ac02', 'repeat merge is a no-op returning the target');
-- Beta into Delta: earlier aliases (Alpha, Gamma) re-point to Delta
select merge_activity('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-00000000ac06');
select is((select array_agg(merged_into_id order by name) from activities where id in ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac05', '00000000-0000-0000-0000-00000000ac02')),
  array['00000000-0000-0000-0000-00000000ac06'::uuid, '00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac06'], 'earlier aliases re-point to the new target');
reset role;
select is((select count(*)::int from entry_activities where user_id = '00000000-0000-0000-0000-0000000000a2' and activity_id = '00000000-0000-0000-0000-00000000ac03'), 2, 'another user''s Entries untouched');
-- the filter: a2's Entry points at a2's Activity; a1 cannot merge it, and a2's rows stay
update entry_activities set activity_id = '00000000-0000-0000-0000-00000000ac04' where entry_id = '00000000-0000-0000-0000-000000000005';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-00000000ac06')$$, 'P0001', 'activity_not_found', 'cannot merge another user''s Activity');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac03')$$, 'P0001', 'activity_not_found', 'cannot merge into another user''s Activity');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac06')$$, 'P0001', 'activity_not_found', 'cannot merge into itself');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac01')$$, 'P0001', 'activity_not_found', 'cannot merge into a merged Activity');
reset role;
select is((select activity_id from entry_activities where entry_id = '00000000-0000-0000-0000-000000000005'), '00000000-0000-0000-0000-00000000ac04'::uuid, 'a2 Entry unchanged after refused merges');

-- activity_slots: last 12 weeks, in the Entry's own zone, own rows only
delete from entries;
create temp table base as select date_trunc('day', now() at time zone 'UTC') - interval '2 days' + interval '23:30' as ts;
grant select on base to authenticated;
create temp table slot_ids as select gen_random_uuid() as id, v.* from (values ('Asia/Tokyo', interval '0'), ('Asia/Tokyo', interval '0'), ('UTC', interval '0'), ('UTC', interval '-13 weeks')) v(tz, off);
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_source)
select id, '00000000-0000-0000-0000-0000000000a1', 'x', (select ts from base) at time zone 'UTC' + off,
       (select ts from base) at time zone 'UTC' + off + interval '10 minutes', tz, now(), 'me'
from slot_ids;
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_source)
values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'y', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), 'ai');
insert into entry_activities (entry_id, activity_id, user_id) select id, '00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-0000000000a1' from slot_ids;
insert into entry_activities (entry_id, activity_id, user_id) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from activity_slots()), 2, 'one row per zone-local slot; the 13-week-old and other user''s Entries are out');
select is((select n from activity_slots() where hour = 8), 2, 'Tokyo Entries count at 08:xx local');
select is((select dow from activity_slots() where hour = 8), (select extract(dow from (ts + interval '9 hours'))::int from base), 'weekday follows the Entry''s zone');
select is((select n from activity_slots() where hour = 23), 1, 'UTC Entry counts at 23:xx');
reset role;

-- The migration's cut of existing long names: same-cut names stay distinct (no unique violation)
reset role;
alter table activities drop constraint activity_name_too_long;
insert into activities (user_id, name, created_at) values
  ('00000000-0000-0000-0000-0000000000a2', repeat('p', 60), now()),
  ('00000000-0000-0000-0000-0000000000a2', repeat('p', 60) || 'q', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a2', repeat('p', 60) || 'r', now() - interval '2 days');
select lives_ok($$select cut_long_activity_names()$$, 'cut raises no unique violation');
select is((select count(distinct lower(name))::int from activities where name like 'pppp%'), 3, 'the three names stay distinct');
select ok((select max(char_length(name)) <= 60 from activities where name like 'pppp%'), 'all at most 60 characters');

select * from finish();
rollback;
