begin;
create extension if not exists pgtap with schema extensions;
select plan(54);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

create function a1() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000a1'::uuid $$;
create function a2() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000a2'::uuid $$;
create function eid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid $$;
create function aid(n text) returns uuid language sql as $$ select id from activities where name = n and user_id = a1() $$;
create function upd(n int) returns timestamptz language sql as $$ select updated_at from entries where id = eid(n) $$;
create function names(n int) returns text[] language sql as $$
  select coalesce(array_agg(a.name order by a.name), '{}') from entry_activities ea join activities a on a.id = ea.activity_id where ea.entry_id = eid(n) $$;
grant execute on function a1(), a2(), eid(int), aid(text), upd(int), names(int) to authenticated;
create temp table deep as select id from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on deep to authenticated;

-- a1: Alpha, Beta, Gamma, Delta (active); Old merged into Alpha. a2: Theirs.
insert into activities (user_id, name) values (a1(), 'Alpha'), (a1(), 'Beta'), (a1(), 'Gamma'), (a1(), 'Delta'), (a2(), 'Theirs');
insert into activities (user_id, name, status, merged_into_id) values (a1(), 'Old', 'merged', aid('Alpha'));

-- Entries 1 to 8 are a1's, 9 is a2's.
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at)
select eid(n), case when n = 9 then a2() else a1() end, 'e' || n,
       now() - interval '9 hours' - n * interval '1 minute', now() - interval '8 hours' - n * interval '1 minute', 'UTC', now()
from generate_series(1, 9) n;
insert into entry_activities (entry_id, activity_id, user_id) values (eid(9), (select id from activities where name = 'Theirs'), a2());

-- Shape and privileges
select ok(has_table_privilege('authenticated', 'public.entry_activities', 'select')
  and not has_table_privilege('authenticated', 'public.entry_activities', 'insert')
  and not has_table_privilege('authenticated', 'public.entry_activities', 'update')
  and not has_table_privilege('authenticated', 'public.entry_activities', 'delete')
  and not has_table_privilege('anon', 'public.entry_activities', 'select'), 'entry_activities: select only, for authenticated');
select col_is_pk('public', 'entry_activities', array['entry_id', 'activity_id'], 'primary key (entry_id, activity_id)');
select ok(has_function_privilege('authenticated', 'public.set_entry_activities(uuid, text[])', 'execute')
  and not has_function_privilege('anon', 'public.set_entry_activities(uuid, text[])', 'execute'), 'set_entry_activities for authenticated only');
select ok(not has_function_privilege('authenticated', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text[])', 'execute')
  and not has_function_privilege('anon', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text[])', 'execute')
  and has_function_privilege('service_role', 'public.save_ai_labels(uuid, timestamptz, uuid, text, text, text[])', 'execute'), 'save_ai_labels(text[]) for service_role only');
select ok(not has_function_privilege('authenticated', 'public.set_entry_activity_rows(uuid, uuid, uuid[], public.tag_source)', 'execute')
  and not has_function_privilege('authenticated', 'public.resolve_activity_list(uuid, text[])', 'execute')
  and not has_function_privilege('authenticated', 'public.entry_json(uuid, uuid)', 'execute'), 'helpers are not callable by the app roles');
select is((select count(*)::int from pg_proc where proname in ('set_entry_activities', 'set_entry_activity_rows', 'resolve_activity_list', 'entry_json', 'save_ai_labels', 'set_entry_activity', 'merge_activity', 'activity_slots', 'entries_clear_tag_on_text_edit')
  and prosecdef and proconfig = array['search_path=""']), 10, 'security definer with empty search_path');

set local role anon;
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['X'])$$, '42501', null, 'anon cannot call set_entry_activities');
reset role;

-- Phone: set_entry_activities as a1
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select jsonb_array_length(set_entry_activities(eid(1), array[' alpha ', 'Brand   New']) -> 'entry' -> 'activity_ids')), 2, 'two names, two rows');
select is((select names(1)), array['Alpha', 'Brand New'], 'names resolved (case, spaces) and a new one created');
select results_eq($$select activity_source::text, activity_id = (select id from activities where name = 'Alpha') from entries where id = eid(1)$$,
  $$values ('me', true)$$, 'source me; the first name mirrors into entries.activity_id');
select is((select set_entry_activities(eid(1), array['Alpha', 'Brand New']) -> 'entry' ->> 'activity_source'), 'me', 'returns the entry');
select is((select jsonb_array_length(set_entry_activities(eid(1), array['Old', 'Beta', 'Gamma']) -> 'entry' -> 'activity_ids')), 3, 'an alias resolves to its target; three is allowed');
select is((select names(1)), array['Alpha', 'Beta', 'Gamma'], 'the list is replaced');
select is((select count(*)::int from entry_activities where entry_id = eid(1) and user_id = a1()), 3, 'rows carry the user');

create temp table ts1 as select upd(1) as t;
grant select on ts1 to authenticated;
select set_entry_activities(eid(1), array['Gamma', 'Beta', 'alpha']);
select is((select upd(1)), (select t from ts1), 'repeating the same set (any order) changes nothing');

select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['Alpha', 'Beta', 'Gamma', 'Delta'])$$, 'P0001', 'too_many_activities', 'four names');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['Alpha', 'alpha'])$$, 'P0001', 'duplicate_activity', 'the same name twice');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['Alpha', 'Old'])$$, 'P0001', 'duplicate_activity', 'a name and its alias');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['Alpha', '  '])$$, 'P0001', 'activity_name_blank', 'blank name');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array['Alpha', null])$$, 'P0001', 'activity_name_blank', 'null name in the list');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000001', array[repeat('x', 61)])$$, 'P0001', 'activity_name_too_long', 'name over 60');
select is((select names(1)), array['Alpha', 'Beta', 'Gamma'], 'a refused call changes nothing');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-0000000000ff', array['X'])$$, 'P0001', 'entry_not_found', 'unknown Entry');
select throws_ok($$select set_entry_activities('00000000-0000-0000-0000-000000000009', array['X'])$$, 'P0001', 'entry_not_found', 'another user''s Entry looks missing');

select is((select set_entry_activities(eid(1), null) -> 'entry' -> 'activity_ids'), '[]'::jsonb, 'null = none');
select is((select count(*)::int from entry_activities where entry_id = eid(1)), 0, 'no rows left');
select results_eq($$select activity_source::text, activity_id from entries where id = eid(1)$$, $$values ('me', null::uuid)$$, 'none is a me choice');

-- the old one-name call writes the new table
select set_entry_activity(eid(2), 'Delta');
select is((select names(2)), array['Delta'], 'set_entry_activity writes the new table');
select set_entry_activity(eid(2), 'Alpha');
select is((select names(2)), array['Alpha'], 'and replaces the list with that one name');
select set_entry_activity(eid(2), null);
select is((select names(2)), '{}'::text[], 'null clears it');

-- RLS and no direct writes
select is((select count(*)::int from entry_activities where entry_id = eid(9)), 0, 'a1 does not see a2''s rows');
select throws_ok($$insert into entry_activities (entry_id, activity_id, user_id) values ('00000000-0000-0000-0000-000000000004', (select id from activities where name = 'Alpha'), auth.uid())$$, '42501', null, 'no direct insert');
select throws_ok($$delete from entry_activities where user_id = auth.uid()$$, '42501', null, 'no direct delete');

-- text edit: an AI list is cleared, a me list stays
reset role;
select save_ai_labels(eid(4), upd(4), null, null, null, array['Alpha', 'Beta']);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select names(4)), array['Alpha', 'Beta'], 'AI list saved');
select set_entry_activities(eid(5), array['Alpha', 'Beta']);
update entries set text = 'changed 4' where id = eid(4) and user_id = auth.uid();
update entries set text = 'changed 5' where id = eid(5) and user_id = auth.uid();
select is((select names(4)), '{}'::text[], 'text edit clears the AI rows');
select results_eq($$select activity_source::text, activity_id from entries where id = eid(4)$$, $$values (null::text, null::uuid)$$, 'and the AI source');
select is((select names(5)), array['Alpha', 'Beta'], 'a me list stays after a text edit');

-- merge with both on one Entry: Alpha into Beta
select set_entry_activities(eid(3), array['Alpha']);
select set_entry_activities(eid(6), array['Alpha', 'Beta']);
select set_entry_activities(eid(7), array['Beta', 'Delta']);
select merge_activity(aid('Alpha'), aid('Beta'));
select is((select names(6)), array['Beta'], 'an Entry with both keeps one row');
select is((select names(3)), array['Beta'], 'an Entry with only the merged one moves');
select is((select names(7)), array['Beta', 'Delta'], 'an Entry without it is untouched');
select is((select count(*)::int from entry_activities where activity_id = aid('Alpha')), 0, 'no row left on the merged Activity');
select is((select activity_id from entries where id = eid(3)), aid('Beta'), 'the old column follows the merge');
select throws_ok($$select merge_activity((select id from activities where name = 'Theirs'), (select id from activities where name = 'Beta'))$$, 'P0001', 'activity_not_found', 'cannot merge another user''s Activity');

-- chips: an Entry counts once for each of its Activities
-- Rows now: Beta on Entries 3, 5, 6, 7; Delta on Entry 7.
select is((select sum(n)::int from activity_slots() where activity_id = aid('Beta')), 4, 'Beta counts its four Entries');
select is((select sum(n)::int from activity_slots() where activity_id = aid('Delta')), 1, 'Delta counts Entry 7');
select is((select sum(n)::int from activity_slots()), 5, 'Entry 7 counts once for each of its two Activities');
reset role;

select is((select count(*)::int from entry_activities where user_id = a2()), 1, 'a2''s row untouched by all of the above');

-- AI list: save_ai_labels(text[])
select save_ai_labels(eid(8), upd(8), (select id from deep), null, null, array['Alpha', 'Old', 'Brand New', 'Beta', 'Delta']);
select is((select names(8)), array['Beta', 'Brand New', 'Delta'], 'AI: the Alpha alias repeat is dropped after resolving, then the first 3 kept');
select results_eq($$select activity_source::text from entries where id = eid(8)$$, $$values ('ai')$$, 'AI source');
select is(save_ai_labels(eid(8), upd(8) - interval '1 second', null, null, null, array['Gamma']), false, 'stale read saves nothing');
select is((select names(8)), array['Beta', 'Brand New', 'Delta'], 'stale call left the list');
select save_ai_labels(eid(8), upd(8), null, null, null, '{}'::text[]);
select results_eq($$select activity_source::text, (select count(*)::int from entry_activities where entry_id = eid(8)) from entries where id = eid(8)$$, $$values ('ai', 0)$$, 'AI found none: source ai, no rows');
select save_ai_labels(eid(5), upd(5), null, null, null, array['Delta']);
select is((select names(5)), array['Beta'], 'AI never overwrites a me list');
select save_ai_labels(eid(4), upd(4), null, null, null, 'Gamma'::text);
select is((select names(4)), array['Gamma'], 'old 6-arg save_ai_labels is a list of one');

select * from finish();
rollback;
