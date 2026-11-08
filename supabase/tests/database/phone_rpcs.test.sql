begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

-- Fixtures as postgres. Categories: Deep (active), New1 / New2 / New3 (suggested), Old (rejected), Other user's Deep.
insert into categories (id, user_id, name, description, status) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'New1', 'd', 'suggested'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a1', 'New2', 'd', 'suggested'),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-0000000000a1', 'Old', 'd', 'rejected'),
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-0000000000a2', 'Sug', 'd', 'suggested');
create temp table deep as select id from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on deep to authenticated;

-- e1: AI Tag Deep, suggests New1. e2: Tag me Deep, suggests New1. e3: AI Tag Deep, suggests New2. e4: untagged. e5: other user's.
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, category_id, tag_source, tagged_at, suggested_category_id)
select e.id, '00000000-0000-0000-0000-0000000000a1', 'e', now() - interval '5 hours', now() - interval '4 hours', 'UTC', now(),
       (select id from deep), e.src::public.tag_source, '2026-01-01 10:00+00', e.sug
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ai', '00000000-0000-0000-0000-00000000c001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'me', '00000000-0000-0000-0000-00000000c001'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'ai', '00000000-0000-0000-0000-00000000c002'::uuid)) as e(id, src, sug);
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'untagged', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a2', 'theirs', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now());

-- anon cannot execute
set local role anon;
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000c001')$$, '42501', null, 'anon cannot call set_entry_tag');
select throws_ok($$select approve_category('00000000-0000-0000-0000-00000000c001')$$, '42501', null, 'anon cannot call approve_category');
select throws_ok($$select reject_category('00000000-0000-0000-0000-00000000c001')$$, '42501', null, 'anon cannot call reject_category');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- set_entry_tag
select is((select set_entry_tag('00000000-0000-0000-0000-000000000004', (select id from deep)) -> 'entry' ->> 'tag_source'), 'me', 'set_entry_tag returns the entry with tag_source me');
select is((select tag_source::text || (tagged_at is not null)::text from entries where id = '00000000-0000-0000-0000-000000000004'), 'metrue', 'Tag me with tagged_at set');
select lives_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000004', (select id from deep))$$, 'repeat is fine');
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-0000000000ff', (select id from deep))$$, 'P0001', 'entry_not_found', 'unknown Entry');
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000005', (select id from deep))$$, 'P0001', 'entry_not_found', 'another user''s Entry looks missing');
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000c001')$$, 'P0001', 'category_not_active', 'Suggested category refused');
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000c003')$$, 'P0001', 'category_not_active', 'Rejected category refused');
select throws_ok($$select set_entry_tag('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000c004')$$, 'P0001', 'category_not_active', 'another user''s Category refused');

-- approve_category
select is((select approve_category('00000000-0000-0000-0000-00000000c001') -> 'moved_entry_ids'), '["00000000-0000-0000-0000-000000000001"]'::jsonb, 'approve moves only the non-me Entry');
select is((select approve_category('00000000-0000-0000-0000-00000000c001') ->'category' ->> 'status'), 'active', 'approve returns the active category');
reset role;
select results_eq($$select category_id, tag_source::text, tagged_at from entries where id = '00000000-0000-0000-0000-000000000001'$$,
  $$values ('00000000-0000-0000-0000-00000000c001'::uuid, 'ai', '2026-01-01 10:00+00'::timestamptz)$$, 'moved Entry keeps tag_source and tagged_at');
select is((select category_id from entries where id = '00000000-0000-0000-0000-000000000002'), (select id from deep), 'Entry tagged by me stays put');
select is((select category_id from entries where id = '00000000-0000-0000-0000-000000000003'), (select id from deep), 'Entry suggesting another category stays put');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select approve_category('00000000-0000-0000-0000-00000000c001') -> 'moved_entry_ids'), '[]'::jsonb, 'repeat approve is a no-op');
select throws_ok($$select approve_category('00000000-0000-0000-0000-00000000c003')$$, 'P0001', 'category_already_decided', 'approve a rejected category');
select throws_ok($$select approve_category('00000000-0000-0000-0000-00000000c004')$$, 'P0001', 'category_not_active', 'cannot approve another user''s category');

-- reject_category
select is((select reject_category('00000000-0000-0000-0000-00000000c002') -> 'category' ->> 'status'), 'rejected', 'reject sets rejected');
select is((select reject_category('00000000-0000-0000-0000-00000000c002') -> 'moved_entry_ids'), '[]'::jsonb, 'repeat reject is a no-op');
select throws_ok($$select reject_category('00000000-0000-0000-0000-00000000c001')$$, 'P0001', 'category_already_decided', 'reject an active category');
select throws_ok($$select approve_category('00000000-0000-0000-0000-00000000c002')$$, 'P0001', 'category_already_decided', 'approve after reject');
reset role;
select results_eq($$select category_id, suggested_category_id from entries where id = '00000000-0000-0000-0000-000000000003'$$,
  $$values ((select id from deep), '00000000-0000-0000-0000-00000000c002'::uuid)$$, 'reject leaves Tags and suggested_category_id');
select is((select status::text from categories where id = '00000000-0000-0000-0000-00000000c004'), 'suggested', 'other user''s category untouched');

-- functions are security definer with an empty search_path
select is((select count(*)::int from pg_proc where proname in ('set_entry_tag', 'approve_category', 'reject_category')
  and prosecdef and proconfig = array['search_path=""'] ), 3, 'rpcs are security definer with search_path empty');
select is((select count(*)::int from pg_proc where proname in ('set_entry_tag', 'approve_category', 'reject_category')
  and has_function_privilege('authenticated', oid, 'execute') and not has_function_privilege('anon', oid, 'execute')), 3, 'execute for authenticated only');

select * from finish();
rollback;
