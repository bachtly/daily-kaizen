begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

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
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_id, activity_source) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'e1', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), '00000000-0000-0000-0000-00000000ac01', 'ai'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'e2', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), '00000000-0000-0000-0000-00000000ac01', 'me'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'e3', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), null, null),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a2', 'e4', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(), '00000000-0000-0000-0000-00000000ac03', 'ai'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a2', 'e5', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), '00000000-0000-0000-0000-00000000ac03', 'ai');

-- anon cannot execute
set local role anon;
select throws_ok($$select set_entry_activity('00000000-0000-0000-0000-000000000003', 'X')$$, '42501', null, 'anon cannot call set_entry_activity');
select throws_ok($$select activity_slots()$$, '42501', null, 'anon cannot call activity_slots');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- set_entry_activity
select is((select set_entry_activity('00000000-0000-0000-0000-000000000003', ' alpha ') -> 'entry' ->> 'activity_source'), 'me', 'returns the entry with source me');
select is((select activity_id from entries where id = '00000000-0000-0000-0000-000000000003'), '00000000-0000-0000-0000-00000000ac01'::uuid, 'name resolved to the Active match');
select is((select set_entry_activity('00000000-0000-0000-0000-000000000003', 'Gamma') -> 'entry' ->> 'activity_id'), '00000000-0000-0000-0000-00000000ac02', 'alias resolves to its target');
select is((select set_entry_activity('00000000-0000-0000-0000-000000000003', 'Brand New') -> 'entry' ->> 'activity_id') is not null, true, 'new name creates an Active Activity');
select is((select status::text from activities where name = 'Brand New'), 'active', 'created Activity is active');
create temp table before_ts as select updated_at from entries where id = '00000000-0000-0000-0000-000000000003';
select set_entry_activity('00000000-0000-0000-0000-000000000003', 'brand   new');
select is((select updated_at from entries where id = '00000000-0000-0000-0000-000000000003'), (select updated_at from before_ts), 'repeat changes nothing');
select is((select set_entry_activity('00000000-0000-0000-0000-000000000003', null) -> 'entry' ->> 'activity_id'), null, 'null clears the Activity');
select is((select activity_source::text from entries where id = '00000000-0000-0000-0000-000000000003'), 'me', 'cleared Activity is a me choice');
select throws_ok($$select set_entry_activity('00000000-0000-0000-0000-0000000000ff', 'X')$$, 'P0001', 'entry_not_found', 'unknown Entry');
select throws_ok($$select set_entry_activity('00000000-0000-0000-0000-000000000004', 'X')$$, 'P0001', 'entry_not_found', 'another user''s Entry looks missing');

-- rename_activity
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', '  Alpha   One ') -> 'activity' ->> 'name'), 'Alpha One', 'rename normalises');
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', 'alpha one') -> 'activity' ->> 'name'), 'alpha one', 'case-only rename is allowed');
select is((select rename_activity('00000000-0000-0000-0000-00000000ac01', 'alpha one') -> 'activity' ->> 'name'), 'alpha one', 'same name again is a no-op');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', 'BETA')$$, 'P0001', 'activity_name_taken', 'clash with an Active name');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac01', 'gamma')$$, 'P0001', 'activity_name_taken', 'clash with a merged name');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac05', 'Gamma 2')$$, 'P0001', 'activity_not_found', 'merged Activity cannot be renamed');
select throws_ok($$select rename_activity('00000000-0000-0000-0000-00000000ac03', 'Mine')$$, 'P0001', 'activity_not_found', 'another user''s Activity looks missing');

-- merge_activity: a1 merges Alpha into Beta
select is((select merge_activity('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac02') -> 'activity' ->> 'id'), '00000000-0000-0000-0000-00000000ac02', 'merge returns the target');
select is((select count(*)::int from entries where activity_id = '00000000-0000-0000-0000-00000000ac02'), 2, 'my Entries moved to the target');
select is((select activity_source::text from entries where id = '00000000-0000-0000-0000-000000000002'), 'me', 'moved Entry keeps its source');
select is((select status::text || merged_into_id::text from activities where id = '00000000-0000-0000-0000-00000000ac01'), 'merged00000000-0000-0000-0000-00000000ac02', 'from is merged into target');
select is((select merge_activity('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac02') -> 'activity' ->> 'id'), '00000000-0000-0000-0000-00000000ac02', 'repeat merge is a no-op returning the target');
-- Beta into Delta: earlier aliases (Alpha, Gamma) re-point to Delta
select merge_activity('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-00000000ac06');
select is((select array_agg(merged_into_id order by name) from activities where id in ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000ac05', '00000000-0000-0000-0000-00000000ac02')),
  array['00000000-0000-0000-0000-00000000ac06'::uuid, '00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac06'], 'earlier aliases re-point to the new target');
reset role;
select is((select count(*)::int from entries where user_id = '00000000-0000-0000-0000-0000000000a2' and activity_id = '00000000-0000-0000-0000-00000000ac03'), 2, 'another user''s Entries untouched');
-- the filter: a2's Entry points at a2's Activity; a1 cannot merge it, and a2's rows stay
update entries set activity_id = '00000000-0000-0000-0000-00000000ac04' where id = '00000000-0000-0000-0000-000000000005';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-00000000ac06')$$, 'P0001', 'activity_not_found', 'cannot merge another user''s Activity');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac03')$$, 'P0001', 'activity_not_found', 'cannot merge into another user''s Activity');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac06')$$, 'P0001', 'activity_not_found', 'cannot merge into itself');
select throws_ok($$select merge_activity('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac01')$$, 'P0001', 'activity_not_found', 'cannot merge into a merged Activity');
reset role;
select is((select activity_id from entries where id = '00000000-0000-0000-0000-000000000005'), '00000000-0000-0000-0000-00000000ac04'::uuid, 'a2 Entry unchanged after refused merges');

-- activity_slots: last 12 weeks, in the Entry's own zone, own rows only
delete from entries;
create temp table base as select date_trunc('day', now() at time zone 'UTC') - interval '2 days' + interval '23:30' as ts;
grant select on base to authenticated;
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_id, activity_source)
select gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'x', (select ts from base) at time zone 'UTC' + off,
       (select ts from base) at time zone 'UTC' + off + interval '10 minutes', tz, now(), '00000000-0000-0000-0000-00000000ac06', 'me'
from (values ('Asia/Tokyo', interval '0'), ('Asia/Tokyo', interval '0'), ('UTC', interval '0'), ('UTC', interval '-13 weeks')) v(tz, off);
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, activity_id, activity_source)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a2', 'y', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), '00000000-0000-0000-0000-00000000ac03', 'ai');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from activity_slots()), 2, 'one row per zone-local slot; the 13-week-old and other user''s Entries are out');
select is((select n from activity_slots() where hour = 8), 2, 'Tokyo Entries count at 08:xx local');
select is((select dow from activity_slots() where hour = 8), (select extract(dow from (ts + interval '9 hours'))::int from base), 'weekday follows the Entry''s zone');
select is((select n from activity_slots() where hour = 23), 1, 'UTC Entry counts at 23:xx');
reset role;

select * from finish();
rollback;
