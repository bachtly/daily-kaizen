begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a1');
create temp table deep as select id from categories where name = 'Deep';
create temp table shallow as select id from categories where name = 'Shallow';
grant select on deep, shallow to authenticated;

-- Helpers: an Entry with a given id suffix and age.
create function mk(n int, age interval default interval '10 minutes') returns uuid language sql as $$
  insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, created_at)
  values (('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000a1',
          'e' || n, now() - interval '9 hours' - n * interval '1 minute', now() - interval '8 hours' - n * interval '1 minute',
          'UTC', now(), now() - age)
  returning id;
$$;
create function eid(n int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid $$;
create function upd(n int) returns timestamptz language sql as $$ select updated_at from entries where id = eid(n) $$;

-- Privileges: service_role only
select is((select count(*)::int from pg_proc where proname in ('untagged_due', 'save_ai_tag', 'record_tag_failure')
  and has_function_privilege('service_role', oid, 'execute')
  and not has_function_privilege('authenticated', oid, 'execute')
  and not has_function_privilege('anon', oid, 'execute')), 3, 'helpers execute for service_role only');
select ok(not has_function_privilege('authenticated', 'public.entries_notify_tagging()', 'execute'), 'trigger function not executable by authenticated');
select is((select count(*)::int from pg_proc where proname in ('untagged_due', 'save_ai_tag', 'record_tag_failure', 'entries_notify_tagging')
  and prosecdef and proconfig = array['search_path=""']), 4, 'all security definer with empty search_path');

-- untagged_due: oldest first, over 2 min old, not given up, untagged
select mk(1, interval '30 minutes');
select mk(2, interval '20 minutes');
select mk(3, interval '1 minute');                       -- too new
select mk(4, interval '40 minutes');                     -- oldest
select mk(5, interval '25 minutes');                     -- given up
update entries set tagging_gave_up_at = now() where id = eid(5);
select mk(6, interval '15 minutes');                     -- tagged
update entries set category_id = (select id from deep), tag_source = 'me', tagged_at = now() where id = eid(6);
select is((select array_agg(id order by created_at) from untagged_due()), array[eid(4), eid(1), eid(2)], 'untagged_due: oldest first, skips new, given up and tagged');
delete from entries;
select mk(n, interval '10 minutes' + n * interval '1 minute') from generate_series(1, 22) n;
select is((select count(*)::int from untagged_due()), 20, 'untagged_due returns at most 20');
select is((select id from untagged_due() limit 1), eid(22), 'untagged_due oldest of 22 first');
delete from entries;

-- save_ai_tag: new Suggested category
select mk(1);
select is(save_ai_tag(eid(1), upd(1), (select id from deep), 'Admin', 'Paperwork'), true, 'new Suggested category returns true');
select results_eq($$select category_id, tag_source::text, tagged_at is not null, tag_attempts from entries where id = eid(1)$$,
  $$values ((select id from deep), 'ai', true, 0)$$, 'Entry tagged ai');
select is((select status::text from categories where name = 'Admin'), 'suggested', 'proposed category inserted as suggested');
select is((select suggested_category_id from entries where id = eid(1)), (select id from categories where name = 'Admin'), 'Entry links its Suggested category');

-- guard misses: stale updated_at / tag_source me. Nothing inserted.
select mk(2);
select is(save_ai_tag(eid(2), upd(2) - interval '1 second', (select id from deep), 'Stale', 'x'), false, 'stale updated_at saves nothing');
select is((select count(*)::int from categories where name = 'Stale'), 0, 'no category inserted when the guard misses');
select is((select category_id from entries where id = eid(2)), null, 'Entry still Untagged after guard miss');
select mk(3);
update entries set category_id = (select id from shallow), tag_source = 'me', tagged_at = now() where id = eid(3);
select is(save_ai_tag(eid(3), upd(3), (select id from deep), 'Mine', 'x'), false, 'tag_source me is never overwritten');
select is((select category_id from entries where id = eid(3)), (select id from shallow), 'me Tag intact');
select is(save_ai_tag(eid(99), now(), (select id from deep), null, null), false, 'missing Entry saves nothing');

-- race: two runs with the same read value, only the first applies
select mk(4);
create temp table t4 as select upd(4) as ts;
select is(save_ai_tag(eid(4), (select ts from t4), (select id from deep), 'Race', 'r'), true, 'first run applies');
select is(save_ai_tag(eid(4), (select ts from t4), (select id from shallow), 'Race2', 'r'), false, 'second run with the same read value is refused');
select is((select count(*)::int from categories where name = 'Race2'), 0, 'second run inserted nothing');

-- name already exists: Suggested -> linked, no new; Rejected -> no suggestion
select mk(5);
select is(save_ai_tag(eid(5), upd(5), (select id from deep), 'admin', 'again'), false, 'existing Suggested name (any case) is not new');
select is((select suggested_category_id from entries where id = eid(5)), (select id from categories where name = 'Admin'), 'Entry links the existing Suggested category');
insert into categories (user_id, name, description, status) values ('00000000-0000-0000-0000-0000000000a1', 'Nope', 'd', 'rejected');
select mk(6);
select is(save_ai_tag(eid(6), upd(6), (select id from deep), 'nope', 'again'), false, 'Rejected name not re-proposed');
select is((select suggested_category_id from entries where id = eid(6)), null, 'no suggestion for a Rejected name');
select mk(7);
select is(save_ai_tag(eid(7), upd(7), (select id from deep), null, null), false, 'no proposal returns false');
select is((select tag_source::text from entries where id = eid(7)), 'ai', 'still tagged');
select throws_ok($$select save_ai_tag(eid(7), (select updated_at from entries where id = eid(7)), (select id from categories where name = 'Admin'), null, null)$$, 'P0001', 'category_not_active', 'Tag must point at an active Category');

-- record_tag_failure
select mk(8);
select record_tag_failure(eid(8), upd(8));
select is((select tag_attempts from entries where id = eid(8)), 1, 'failure counts an attempt');
select record_tag_failure(eid(8), (select upd(8) - interval '1 second'));
select is((select tag_attempts from entries where id = eid(8)), 1, 'stale failure is not counted');
select record_tag_failure(eid(8), upd(8));
select record_tag_failure(eid(8), upd(8));
select results_eq($$select tag_attempts, tagging_gave_up_at is not null from entries where id = eid(8)$$, $$values (3, true)$$, 'gives up at 3 attempts');

-- Insert trigger, fired by authenticated, never fails the insert
select vault.create_secret('s3cret', 'job_secret');
select vault.create_secret('https://example.test/functions/v1/tag-entries', 'tag_entries_url');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$insert into entries (id, text, started_at, ended_at, time_zone, form_opened_at) values ('00000000-0000-0000-0000-0000000000b1', 'trig', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, 'insert as authenticated works with the trigger');
reset role;
select is((select count(*)::int from net.http_request_queue where url = 'https://example.test/functions/v1/tag-entries'
  and body = convert_to('{"entry_id": "00000000-0000-0000-0000-0000000000b1"}', 'UTF8')
  and headers ->> 'x-job-secret' = 's3cret'), 1, 'trigger queued a pg_net call with the entry id and job secret');

-- pg_net error: bad URL raises inside http_post; the insert still succeeds
select vault.update_secret((select id from vault.secrets where name = 'tag_entries_url'), 'not-a-url');
select lives_ok($$insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'trig2', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, 'pg_net error does not fail the insert');
select is((select count(*)::int from entries where id = '00000000-0000-0000-0000-0000000000b2'), 1, 'Entry saved despite the pg_net error');

-- missing secrets: quiet no-op
delete from vault.secrets where name in ('job_secret', 'tag_entries_url');
select lives_ok($$insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'trig3', now() - interval '2 hours', now() - interval '1 hour', 'UTC', now())$$, 'insert works with no Vault config');
select is((select count(*)::int from net.http_request_queue where body = convert_to('{"entry_id": "00000000-0000-0000-0000-0000000000b3"}', 'UTF8')), 0, 'no call without config');

select * from finish();
rollback;
