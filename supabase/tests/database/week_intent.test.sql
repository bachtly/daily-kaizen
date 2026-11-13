begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

create temp table cats as
  select 'mine'::text as who, id from categories where user_id = '00000000-0000-0000-0000-0000000000a1' limit 1;
insert into cats select 'theirs', id from categories where user_id = '00000000-0000-0000-0000-0000000000a2' limit 1;
grant select on cats to anon, authenticated;

set local role anon;
select throws_ok($$select set_category_target(gen_random_uuid(), 60)$$, '42501', null, 'anon cannot call set_category_target');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select set_category_target((select id from cats where who = 'mine'), 90) -> 'category' ->> 'weekly_target_minutes'), '90', 'sets the target');
select is((select weekly_target_minutes from categories where id = (select id from cats where who = 'mine')), 90, 'target stored as minutes');
select is((select set_category_target((select id from cats where who = 'mine'), 30) -> 'category' ->> 'weekly_target_minutes'), '30', 'lower bound 30 is allowed');
select is((select set_category_target((select id from cats where who = 'mine'), 4800) -> 'category' ->> 'weekly_target_minutes'), '4800', 'upper bound 4800 is allowed');
select throws_ok($$select set_category_target((select id from cats where who = 'mine'), 29)$$, 'P0001', 'category_target_out_of_range', 'below 30');
select throws_ok($$select set_category_target((select id from cats where who = 'mine'), 4801)$$, 'P0001', 'category_target_out_of_range', 'above 4800');
select is((select set_category_target((select id from cats where who = 'mine'), null) -> 'category' ->> 'weekly_target_minutes'), null, 'null clears the target');
select throws_ok($$select set_category_target((select id from cats where who = 'theirs'), 60)$$, 'P0001', 'category_not_found', 'another user''s Category looks missing');
select throws_ok($$select set_category_target(gen_random_uuid(), 60)$$, 'P0001', 'category_not_found', 'unknown Category');

reset role;
select is((select weekly_target_minutes from categories where id = (select id from cats where who = 'theirs')), null, 'another user''s Category is untouched');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$insert into weekly_reviews (week_start, next_change) values ('2026-11-02', repeat('x', 140))$$, 'insert grant covers next_change, 140 allowed');
select throws_ok($$insert into weekly_reviews (week_start, next_change) values ('2026-11-09', repeat('x', 141))$$, '23514', null, 'next_change over 140 is a check violation');

select * from finish();
rollback;
