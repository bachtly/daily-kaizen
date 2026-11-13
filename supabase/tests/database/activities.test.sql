begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');
create temp table deep as select id from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1';
create temp table shallow as select id from categories where name = 'Shallow' and user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on deep, shallow to authenticated;

create function mk(n int) returns uuid language sql as $$
  insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at)
  values (('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000a1',
          'e' || n, now() - interval '9 hours' - n * interval '1 minute', now() - interval '8 hours' - n * interval '1 minute', 'UTC', now())
  returning id;
$$;
create function eid(n int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid $$;
create function upd(n int) returns timestamptz language sql as $$ select updated_at from entries where id = eid(n) $$;
create function a1() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000a1'::uuid $$;

-- Privileges and shape
select ok(not has_function_privilege('authenticated', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text)', 'execute')
  and has_function_privilege('service_role', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text)', 'execute'), 'save_ai_labels for service_role only');
select ok(not has_function_privilege('authenticated', 'public.resolve_activity(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.resolve_activity(uuid, text)', 'execute')
 , 'resolve_activity is not callable by the app roles');
select is((select count(*)::int from pg_proc where proname in ('resolve_activity', 'save_ai_labels')
  and prosecdef and proconfig = array['search_path=""']), 3, 'security definer with empty search_path');

-- Name resolution: create, case/space-insensitive match, no duplicate
create temp table first_ra as select resolve_activity(a1(), '  Company   A ') as id;
select is((select id from first_ra), (select id from activities where name = 'Company A'), 'new name inserted, normalised');
select is(resolve_activity(a1(), 'company a'), (select id from activities where name = 'Company A'), 'matches an Active name in any case');
select is((select count(*)::int from activities where user_id = a1()), 1, 'no duplicate');
select is(resolve_activity(a1(), '   '), null, 'blank name is no activity');
select is(resolve_activity(a1(), null), null, 'null name is no activity');

-- Aliases incl. chains: Old -> Mid -> Target
insert into activities (user_id, name) values (a1(), 'Target');
insert into activities (user_id, name, status, merged_into_id)
  select a1(), 'Mid', 'merged', id from activities where name = 'Target';
insert into activities (user_id, name, status, merged_into_id)
  select a1(), 'Old', 'merged', id from activities where name = 'Mid';
select is(resolve_activity(a1(), 'old'), (select id from activities where name = 'Target'), 'alias chain resolves to the end');
select is(resolve_activity(a1(), 'MID'), (select id from activities where name = 'Target'), 'single alias resolves');
select is((select count(*)::int from activities where user_id = a1()), 4, 'aliases create nothing');

-- Another user's names are separate
select isnt(resolve_activity('00000000-0000-0000-0000-0000000000a2', 'Target'), (select id from activities where name = 'Target' and user_id = a1()), 'names are per user');
delete from activities where user_id = '00000000-0000-0000-0000-0000000000a2';

-- Uniqueness is normalised
select throws_ok($$insert into activities (user_id, name) values ('00000000-0000-0000-0000-0000000000a1', ' TARGET ')$$, '23505', null, 'unique on lower(btrim(name))');
select throws_ok($$insert into activities (user_id, name, status) values ('00000000-0000-0000-0000-0000000000a1', 'x', 'merged')$$, '23514', null, 'merged needs a target');

-- RLS: a1 sees only own; no direct writes
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from activities), 4, 'sees only own activities');
select throws_ok($$insert into activities (name) values ('Direct')$$, '42501', null, 'no direct insert');
select throws_ok($$update activities set name = 'Hax' where user_id = auth.uid()$$, '42501', null, 'no direct update');
select throws_ok($$delete from activities where user_id = auth.uid()$$, '42501', null, 'no direct delete');
select throws_ok($$update entries set activity_id = null where user_id = auth.uid()$$, '42501', null, 'activity columns not writable');
reset role;

-- save_ai_labels: both labels
select mk(1);
select is(save_ai_labels(eid(1), upd(1), (select id from deep), null, null, 'Company A'), false, 'both labels saved');
select results_eq($$select tag_source::text, activity_source::text, activity_id = (select id from activities where name = 'Company A') from entries where id = eid(1)$$,
  $$values ('ai', 'ai', true)$$, 'Entry has Category and Activity from ai');

-- no activity found: ai with null id
select mk(2);
select save_ai_labels(eid(2), upd(2), (select id from deep), null, null, null);
select results_eq($$select activity_source::text, activity_id from entries where id = eid(2)$$, $$values ('ai', null::uuid)$$, 'no activity is ai with null id');

-- stale updated_at: no-op, nothing created
select mk(3);
select is(save_ai_labels(eid(3), upd(3) - interval '1 second', (select id from deep), null, null, 'Stale Act'), false, 'stale updated_at is a no-op');
select is((select count(*)::int from activities where name = 'Stale Act'), 0, 'stale run created no activity');

-- me kept on either label
select mk(4);
update entries set category_id = (select id from shallow), tag_source = 'me', tagged_at = now() where id = eid(4);
select save_ai_labels(eid(4), upd(4), (select id from deep), null, null, 'Fresh');
select results_eq($$select category_id = (select id from shallow), tag_source::text, activity_source::text, activity_id is not null from entries where id = eid(4)$$,
  $$values (true, 'me', 'ai', true)$$, 'me Category kept, Activity still labelled');
select mk(5);
update entries set activity_id = (select id from activities where name = 'Target'), activity_source = 'me' where id = eid(5);
select save_ai_labels(eid(5), upd(5), (select id from deep), null, null, 'Fresh');
select results_eq($$select tag_source::text, activity_source::text, activity_id = (select id from activities where name = 'Target') from entries where id = eid(5)$$,
  $$values ('ai', 'me', true)$$, 'me Activity kept, Category still labelled');

-- a save that writes nothing keeps the failure count
select mk(6);
update entries set category_id = (select id from shallow), tag_source = 'me', tagged_at = now(),
  activity_source = 'me', tag_attempts = 2 where id = eid(6);
select is(save_ai_labels(eid(6), upd(6), (select id from deep), null, null, 'Nope'), false, 'both me: returns false');
select is((select tag_attempts from entries where id = eid(6)), 2, 'both me: nothing written, attempts kept');

-- text edit trigger: clears AI labels only
update entries set text = 'changed' where id in (eid(1), eid(4), eid(5));
select results_eq($$select category_id is null, activity_id is null, activity_source is null from entries where id = eid(1)$$,
  $$values (true, true, true)$$, 'text edit clears AI labels');
select results_eq($$select tag_source::text, activity_source::text, activity_id is not null from entries where id = eid(4)$$,
  $$values ('me', null, false)$$, 'text edit clears AI Activity, keeps me Category');
select results_eq($$select tag_source::text, activity_source::text, activity_id is not null from entries where id = eid(5)$$,
  $$values (null, 'me', true)$$, 'text edit clears AI Category, keeps me Activity');

select * from finish();
rollback;
