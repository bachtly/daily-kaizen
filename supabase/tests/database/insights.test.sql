begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a2');

-- Weeks relative to a1's current local week (time zone null -> UTC).
create temp table w as select local_monday('00000000-0000-0000-0000-0000000000a1') as this_week;
grant select on w to authenticated;

-- A card as the job writes it.
create function pg_temp.card(p_kind text, p_subject text default '') returns jsonb language sql as $$
  select jsonb_build_object('kind', p_kind, 'subject_key', p_subject, 'rank', 1, 'score', 1.5,
    'facts', '{"waste_h": 6}'::jsonb, 'entry_ids', '{}'::uuid[], 'metric', '{"fn": "x"}'::jsonb,
    'finding', 'Waste clusters after 21:00', 'detail', '6h of 9h', 'try_this', 'If it''s 21:00, then I stop.',
    'text_source', 'ai', 'may_not_apply', null, 'evidence', '{"id": "if-then"}'::jsonb);
$$;

-- service_role job helper
select is(save_insights('00000000-0000-0000-0000-0000000000a1', (select this_week from w),
  jsonb_build_array(pg_temp.card('waste_window'), pg_temp.card('sleep_short'), pg_temp.card('late_work'))), 3, 'save_insights inserts the cards');
select is(save_insights('00000000-0000-0000-0000-0000000000a1', (select this_week - 7 from w),
  jsonb_build_array(pg_temp.card('waste_window'))), 1, 'last week''s card');
select is(save_insights('00000000-0000-0000-0000-0000000000a1', (select this_week - 14 from w),
  jsonb_build_array(pg_temp.card('waste_window'))), 1, 'an older card');
select is(save_insights('00000000-0000-0000-0000-0000000000a2', (select this_week from w),
  jsonb_build_array(pg_temp.card('waste_window'))), 1, 'a2''s card');

create temp table ids as
  select (case when user_id = '00000000-0000-0000-0000-0000000000a2' then 'theirs'
               when week_start = (select this_week - 7 from w) then 'last'
               when week_start = (select this_week - 14 from w) then 'old'
               else kind end) as k, id
  from insights;
grant select on ids to authenticated;

set local role anon;
select throws_ok($$select accept_insight((select id from ids where k = 'waste_window'))$$, '42501', null, 'anon cannot call accept_insight');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select throws_ok($$select save_insights('00000000-0000-0000-0000-0000000000a1', (select this_week from w), '[]')$$, '42501', null, 'the phone cannot call save_insights');
select is((select count(*)::int from insights), 5, 'a1 reads only its own insights');
select throws_ok($$insert into insights (week_start, kind, rank, score, facts, metric, finding, detail, try_this, text_source, evidence)
  values ((select this_week from w), 'x', 1, 1, '{}', '{}', 'f', 'd', 't', 'ai', '{}')$$, '42501', null, 'direct insert is refused');
select throws_ok($$update insights set status = 'accepted'$$, '42501', null, 'direct update is refused');
select throws_ok($$delete from insights$$, '42501', null, 'direct delete is refused');
select throws_ok($$insert into coach_notes (body, source) values ('x', 'me')$$, '42501', null, 'direct coach note insert is refused');
select throws_ok($$insert into week_summaries (week_start, time_zone, as_of, logged_days, facts) values ((select this_week from w), 'UTC', now(), 0, '{}')$$, '42501', null, 'direct summary insert is refused');
select throws_ok($$select * from insight_runs$$, '42501', null, 'the phone cannot read insight_runs');

-- accept
select is((select accept_insight((select id from ids where k = 'waste_window')) -> 'insight' ->> 'status'), 'accepted', 'accept');
select is((select active_until from insights where id = (select id from ids where k = 'waste_window')), (select this_week + 7 from w), 'the change runs next week');
select is((select accept_insight((select id from ids where k = 'waste_window')) -> 'insight' ->> 'status'), 'accepted', 'accepting again changes nothing');
select accept_insight((select id from ids where k = 'sleep_short'));
select is((select status::text from insights where id = (select id from ids where k = 'waste_window')), 'new', 'accepting another card of the week replaces it');
select is((select active_until from insights where id = (select id from ids where k = 'waste_window')), null, 'the replaced card has no run');
select is((select count(*)::int from insights where status = 'accepted' and week_start = (select this_week from w)), 1, 'one accepted card a week');
select is((select accept_insight((select id from ids where k = 'last')) -> 'insight' ->> 'active_until'), (select (this_week)::text from w), 'last week''s card can be accepted and runs this week');
select throws_ok($$select accept_insight((select id from ids where k = 'old'))$$, 'P0001', 'insight_too_old', 'a card from 2 weeks ago cannot be accepted');
select throws_ok($$select accept_insight((select id from ids where k = 'theirs'))$$, 'P0001', 'insight_not_found', 'another user''s card looks missing');
select throws_ok($$select accept_insight('00000000-0000-0000-0000-00000000ffff')$$, 'P0001', 'insight_not_found', 'an unknown id');

-- dismiss, with a reason
select is((select dismiss_insight((select id from ids where k = 'late_work')) -> 'insight' ->> 'dismiss_reason'), null, 'dismiss without a reason');
select is((select status::text from insights where id = (select id from ids where k = 'late_work')), 'dismissed', 'dismissed');
select is((select dismiss_insight((select id from ids where k = 'late_work'), '  I   work nights ') -> 'insight' ->> 'dismiss_reason'), 'I work nights', 'a reason added later, trimmed and collapsed');
select is((select dismiss_insight((select id from ids where k = 'late_work'), null) -> 'insight' ->> 'dismiss_reason'), 'I work nights', 'a null reason keeps the reason');
select is((select dismiss_insight((select id from ids where k = 'late_work'), '   ') -> 'insight' ->> 'dismiss_reason'), 'I work nights', 'a blank reason keeps the reason');
select lives_ok($$select dismiss_insight((select id from ids where k = 'late_work'), repeat('x', 140))$$, '140 characters allowed');
select throws_ok($$select dismiss_insight((select id from ids where k = 'late_work'), repeat('x', 141))$$, 'P0001', 'reason_too_long', 'over 140 is refused');
select dismiss_insight((select id from ids where k = 'sleep_short'), 'not now');
select is((select active_until from insights where id = (select id from ids where k = 'sleep_short')), null, 'dismissing the accepted card ends its run');

-- undo
select is((select undo_insight((select id from ids where k = 'sleep_short')) -> 'insight' ->> 'status'), 'new', 'undo');
select is((select dismiss_reason from insights where id = (select id from ids where k = 'sleep_short')), null, 'undo clears the reason');

-- keep the running change: last week's card runs this week
select is((select keep_change((select id from ids where k = 'last')) -> 'insight' ->> 'active_until'), (select (this_week + 7)::text from w), 'keep: one more week');
select is((select keep_change((select id from ids where k = 'last')) -> 'insight' ->> 'active_until'), (select (this_week + 7)::text from w), 'keeping again changes nothing');
select accept_insight((select id from ids where k = 'waste_window'));
select throws_ok($$select keep_change((select id from ids where k = 'old'))$$, 'P0001', 'change_not_running', 'a card that is not accepted');
select throws_ok($$select keep_change((select id from ids where k = 'theirs'))$$, 'P0001', 'insight_not_found', 'another user''s card');

-- the job keeps cards I acted on
reset role;
select is(save_insights('00000000-0000-0000-0000-0000000000a1', (select this_week from w),
  jsonb_build_array(pg_temp.card('waste_window'), pg_temp.card('sleep_short'), pg_temp.card('focus_length'))), 2, 'regenerating inserts around the acted cards');
select is((select status::text from insights where id = (select id from ids where k = 'waste_window')), 'accepted', 'the accepted card stays');
select is((select status::text from insights where id = (select id from ids where k = 'late_work')), 'dismissed', 'the dismissed card stays');
select is((select count(*)::int from insights where user_id = '00000000-0000-0000-0000-0000000000a1' and week_start = (select this_week from w)), 4, 'new cards are replaced');

-- coach note
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select set_coach_note('  I work nights.  ') -> 'note' ->> 'body'), 'I work nights.', 'set_coach_note trims');
select is((select source::text from coach_notes order by created_at desc limit 1), 'me', 'my note has source me');
select set_coach_note('');
select is((select body from coach_notes order by created_at desc limit 1), '', 'blank clears it as a new version');
select throws_ok($$select set_coach_note(repeat('x', 1201))$$, 'P0001', 'note_too_long', 'over 1200 is refused');
reset role;

select * from finish();
rollback;
