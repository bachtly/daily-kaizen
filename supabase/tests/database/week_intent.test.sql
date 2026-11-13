begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

-- a1: Alpha, Beta (active), Gamma (active, merged into Beta later). a2: Theirs.
insert into activities (id, user_id, name, status) values
  ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a1', 'Alpha', 'active'),
  ('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-0000000000a1', 'Beta', 'active'),
  ('00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a2', 'Theirs', 'active'),
  ('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-0000000000a1', 'Gamma', 'active');

create temp table cats as
  select 'mine'::text as who, id from categories where user_id = '00000000-0000-0000-0000-0000000000a1' order by id limit 1;
insert into cats select 'mine2', id from categories where user_id = '00000000-0000-0000-0000-0000000000a1' and id <> (select id from cats where who = 'mine') order by id limit 1;
insert into cats select 'theirs', id from categories where user_id = '00000000-0000-0000-0000-0000000000a2' limit 1;
grant select on cats to anon, authenticated;

set local role anon;
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 60)$$, '42501', null, 'anon cannot call set_activity_target');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 90) -> 'target' ->> 'minutes'), '90', 'sets an any-Category target');
select is((select set_activity_target('00000000-0000-0000-0000-00000000ac01', (select id from cats where who = 'mine'), 60) -> 'target' ->> 'minutes'), '60', 'sets a per-Category target');
select is((select count(*)::int from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01'), 2, 'any and per-Category coexist');
select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 120);
select is((select minutes from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01' and category_id is null), 120, 'setting again replaces the any target');
select is((select count(*)::int from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01'), 2, 'still two rows after the update');
select is((select minutes from activity_targets where category_id = (select id from cats where who = 'mine')), 60, 'the per-Category target is unchanged');
select lives_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 30)$$, 'lower bound 30');
select lives_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 4800)$$, 'upper bound 4800');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 29)$$, 'P0001', 'target_out_of_range', 'below 30');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 4801)$$, 'P0001', 'target_out_of_range', 'above 4800');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac03', null, 60)$$, 'P0001', 'activity_not_found', 'a1: another user''s Activity looks missing');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', (select id from cats where who = 'theirs'), 60)$$, 'P0001', 'category_not_found', 'a1: another user''s Category looks missing');

-- direct writes are refused
select throws_ok($$insert into activity_targets (activity_id, minutes) values ('00000000-0000-0000-0000-00000000ac02', 60)$$, '42501', null, 'direct insert is refused');
select throws_ok($$update activity_targets set minutes = 60 where activity_id = '00000000-0000-0000-0000-00000000ac01'$$, '42501', null, 'direct update is refused');
select throws_ok($$delete from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01'$$, '42501', null, 'direct delete is refused');

-- only an Active Category
reset role;
update categories set status = 'suggested' where id = (select id from cats where who = 'mine2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', (select id from cats where who = 'mine2'), 60)$$, 'P0001', 'category_not_found', 'a suggested Category looks missing');
reset role;
update categories set status = 'active' where id = (select id from cats where who = 'mine2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- null clears only the matching key
select set_activity_target('00000000-0000-0000-0000-00000000ac01', (select id from cats where who = 'mine'), null);
select is((select count(*)::int from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01' and category_id is not null), 0, 'null clears the per-Category target');
select is((select count(*)::int from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac01' and category_id is null), 1, 'the any target stays');

-- merge: Gamma's targets move to Beta; Beta's own wins on a clash
select set_activity_target('00000000-0000-0000-0000-00000000ac02', null, 100);
select set_activity_target('00000000-0000-0000-0000-00000000ac04', null, 200);
select set_activity_target('00000000-0000-0000-0000-00000000ac04', (select id from cats where who = 'mine2'), 45);
select merge_activity('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-00000000ac02');
select is((select minutes from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac02' and category_id is null), 100, 'merge: into''s own target wins on a clash');
select is((select minutes from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac02' and category_id = (select id from cats where who = 'mine2')), 45, 'merge: a non-clashing target moves');
select is((select count(*)::int from activity_targets where activity_id = '00000000-0000-0000-0000-00000000ac04'), 0, 'merge: nothing stays on the merged Activity');

-- as a2: a1's Activity and Category look missing, a1's targets are untouched
reset role;
create temp table before_targets as select * from activity_targets where user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on before_targets to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, 60)$$, 'P0001', 'activity_not_found', 'a2: a1''s Activity looks missing');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac03', (select id from cats where who = 'mine'), 60)$$, 'P0001', 'category_not_found', 'a2: a1''s Category looks missing');
select throws_ok($$select set_activity_target('00000000-0000-0000-0000-00000000ac01', null, null)$$, 'P0001', 'activity_not_found', 'a2 cannot clear a1''s target');
select is((select count(*)::int from activity_targets), 0, 'a2 reads none of a1''s targets');
reset role;
select is((select count(*)::int from (select * from activity_targets where user_id = '00000000-0000-0000-0000-0000000000a1' except select * from before_targets) x), 0, 'a1''s targets are unchanged');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- Review done note
select lives_ok($$insert into weekly_reviews (week_start, next_change) values ('2026-11-02', repeat('x', 140))$$, 'insert grant covers next_change, 140 allowed');
select throws_ok($$insert into weekly_reviews (week_start, next_change) values ('2026-11-09', repeat('x', 141))$$, '23514', null, 'next_change over 140 is a check violation');
reset role;

select * from finish();
rollback;
