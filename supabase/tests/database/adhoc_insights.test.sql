begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1');
select seed_account('00000000-0000-0000-0000-0000000000b1');
create temp table w as select local_monday('00000000-0000-0000-0000-0000000000b1') as this_week;

create function pg_temp.card(p_kind text, p_subject text, p_rank int, p_metric jsonb) returns jsonb language sql as $$
  select jsonb_build_object('kind', p_kind, 'subject_key', p_subject, 'rank', p_rank, 'score', 0,
    'facts', '{}'::jsonb, 'entry_ids', '{}'::uuid[], 'metric', p_metric,
    'finding', 'Deep work starts at 07:00', 'detail', 'Every morning.', 'try_this', 'If it''s 07:00, then I start.',
    'text_source', 'ai', 'may_not_apply', null, 'evidence', '{}'::jsonb);
$$;

select is(save_insights('00000000-0000-0000-0000-0000000000b1', (select this_week from w), jsonb_build_array(
  pg_temp.card('waste_window', '', 1, '{"fn": "x"}'),
  pg_temp.card('adhoc', 'r1:1', 13, '{"fn": "none"}'))), 2, 'an ad-hoc card saves at rank 13 with no source');
select throws_ok($$select save_insights('00000000-0000-0000-0000-0000000000b1', (select this_week from w),
  jsonb_build_array(pg_temp.card('adhoc', 'r1:2', 14, '{"fn": "none"}')))$$, '23514', null, 'rank 14 is refused');

create temp table ids as select kind as k, id from insights;
grant select on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$select accept_insight((select id from ids where k = 'adhoc'))$$, 'P0001', 'insight_not_measurable',
  'an ad-hoc card cannot be next week''s change');
select is((select accept_insight((select id from ids where k = 'waste_window')) -> 'insight' ->> 'status'), 'accepted',
  'a fixed-check card still can');
select is((select dismiss_insight((select id from ids where k = 'adhoc'), 'not me') -> 'insight' ->> 'status'), 'dismissed',
  'an ad-hoc card can be dismissed with a reason');
reset role;

select * from finish();
rollback;
