begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

-- Fixtures as postgres: one Entry, review, subscription, notification per user.
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'mine', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'theirs', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now());
insert into weekly_reviews (user_id, week_start) values ('00000000-0000-0000-0000-0000000000a2', '2026-11-02');
insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000a2', 'https://push/theirs', 'k', 'a');
insert into notifications_sent (user_id, kind, about) values ('00000000-0000-0000-0000-0000000000a1', 'nudge', 'x');

-- Every public table has RLS
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'every public table has RLS on');

-- anon sees and writes nothing
set local role anon;
select throws_ok($$select * from entries$$, '42501', null, 'anon cannot read entries');
select throws_ok($$select * from categories$$, '42501', null, 'anon cannot read categories');
select throws_ok($$select * from notifications_sent$$, '42501', null, 'anon cannot read notifications_sent');
select throws_ok($$insert into entries (id, text, started_at, ended_at, time_zone, form_opened_at) values (gen_random_uuid(), 'x', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, '42501', null, 'anon cannot insert entries');
select throws_ok($$delete from entries$$, '42501', null, 'anon cannot delete entries');
reset role;

-- authenticated as user a1
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from entries), 1, 'sees only own entries');
select is((select count(*)::int from categories), 5, 'sees only own categories');
select is((select count(*)::int from settings), 1, 'sees only own settings');
select is((select count(*)::int from weekly_reviews), 0, 'does not see another user''s reviews');
select is((select count(*)::int from push_subscriptions), 0, 'does not see another user''s subscriptions');
select throws_ok($$select * from notifications_sent$$, '42501', null, 'no access to notifications_sent');

select lives_ok($$insert into entries (id, text, started_at, ended_at, time_zone, form_opened_at) values ('00000000-0000-0000-0000-000000000003', 'new', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, 'insert with phone columns works, user_id defaults to me');
select is((select user_id::text from entries where id = '00000000-0000-0000-0000-000000000003'), '00000000-0000-0000-0000-0000000000a1', 'user_id defaulted to auth.uid()');
select throws_ok($$insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a2', 'x', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, '42501', null, 'cannot set user_id on insert');
select throws_ok($$update entries set category_id = (select id from categories limit 1) where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null, 'cannot write category_id');
select throws_ok($$update entries set tag_attempts = 5 where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null, 'cannot write tag_attempts');
select lives_ok($$update entries set text = 'mine edited' where id = '00000000-0000-0000-0000-000000000001'$$, 'can edit own text');

-- Another user's row: update and delete touch nothing
update entries set text = 'hacked' where id = '00000000-0000-0000-0000-000000000002';
delete from entries where id = '00000000-0000-0000-0000-000000000002';
reset role;
select is((select text from entries where id = '00000000-0000-0000-0000-000000000002'), 'theirs', 'another user''s Entry is untouched by update and delete');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$insert into categories (name, description) values ('x', 'y')$$, '42501', null, 'cannot write categories');
select lives_ok($$insert into weekly_reviews (week_start) values ('2026-11-02')$$, 'can insert own Review done');
select lives_ok($$insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push/mine', 'k', 'a') on conflict (endpoint) do update set p256dh = excluded.p256dh$$, 'can upsert own push subscription');
select lives_ok($$update settings set quiet_start = '22:00', time_zone = 'UTC'$$, 'can update own settings');
select throws_ok($$insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push/theirs', 'k2', 'a2') on conflict (endpoint) do update set p256dh = excluded.p256dh$$, '42501', null, 'cannot upsert over another user''s push subscription');
select lives_ok($$update settings set quiet_start = '01:00' where user_id = '00000000-0000-0000-0000-0000000000a2'$$, 'update of another user''s settings is a silent no-op');
select throws_ok($$select seed_account('00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'cannot run seed_account');
select throws_ok($$insert into settings (user_id) values ('00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'cannot insert settings');
reset role;

select is((select quiet_start::text from settings where user_id = '00000000-0000-0000-0000-0000000000a2'), '23:00:00', 'another user''s settings untouched');
select is((select p256dh from push_subscriptions where endpoint = 'https://push/theirs'), 'k', 'another user''s push subscription untouched');

-- Functions created later are not executable by the app roles
create function public.zz_new_fn() returns int language sql as 'select 1';
set local role anon;
select throws_ok($$select public.zz_new_fn()$$, '42501', null, 'anon cannot execute a new function');
reset role;
set local role authenticated;
select throws_ok($$select public.zz_new_fn()$$, '42501', null, 'authenticated cannot execute a new function');
reset role;

select * from finish();
rollback;
