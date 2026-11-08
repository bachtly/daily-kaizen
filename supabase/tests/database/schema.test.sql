begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');

-- seed_account
select seed_account('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from categories where user_id = '00000000-0000-0000-0000-0000000000a1'), 5, 'seed adds 5 Categories, repeat is a no-op');
select is((select count(*)::int from settings where user_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'seed adds settings once');
select is((select quiet_start::text || '-' || quiet_end::text from settings), '23:00:00-07:00:00', 'default Quiet hours');
select is((select description from categories where name = 'Recovery'), 'Deliberate rest that restores energy, such as sleep, a workout or walk, or a relaxed meal with friends. Entertainment chosen on purpose counts here; the same done aimlessly is Waste.', 'exact Recovery description');
select is((select status::text from categories where name = 'Deep'), 'active', 'seeded Categories are active');

-- Category names unique per user, case-insensitive
select throws_ok($$insert into categories (user_id, name, description) values ('00000000-0000-0000-0000-0000000000a1', 'deep', 'x')$$, '23505', null, 'category name unique ignoring case');
select lives_ok($$insert into categories (user_id, name, description) values ('00000000-0000-0000-0000-0000000000a2', 'deep', 'x')$$, 'same name allowed for another user');

-- Entry checks
prepare ins(uuid, text, timestamptz, timestamptz, text) as
  insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at)
  values ($1, '00000000-0000-0000-0000-0000000000a1', $2, $3, $4, $5, now());

select lives_ok($$execute ins('00000000-0000-0000-0000-000000000001', 'work', now() - interval '2 hours', now() - interval '1 hour', 'Asia/Ho_Chi_Minh')$$, 'valid entry saves');
select throws_ok($$execute ins('00000000-0000-0000-0000-000000000002', '   ', now() - interval '2 hours', now() - interval '1 hour', 'UTC')$$, '23514', null, 'blank text is a check violation');
select throws_like($$execute ins('00000000-0000-0000-0000-000000000002', '   ', now() - interval '2 hours', now() - interval '1 hour', 'UTC')$$, '%entry_text_empty%', 'entry_text_empty key');
select throws_like($$execute ins('00000000-0000-0000-0000-000000000003', 'x', now() - interval '1 hour', now() - interval '1 hour', 'UTC')$$, '%entry_end_not_after_start%', 'entry_end_not_after_start key');
select throws_ok($$execute ins('00000000-0000-0000-0000-000000000004', 'x', now(), now() + interval '6 minutes', 'UTC')$$, 'P0001', 'entry_end_in_future', 'entry_end_in_future on create');
select lives_ok($$execute ins('00000000-0000-0000-0000-000000000005', 'x', now() - interval '1 hour', now() + interval '4 minutes', 'UTC')$$, 'end 4 min ahead is allowed');
select throws_ok($$execute ins('00000000-0000-0000-0000-000000000006', 'x', now() - interval '1 hour', now(), 'Mars/Olympus')$$, 'P0001', 'time_zone_unknown', 'time_zone_unknown on entry');
select throws_ok($$update entries set ended_at = now() + interval '10 minutes' where id = '00000000-0000-0000-0000-000000000001'$$, 'P0001', 'entry_end_in_future', 'entry_end_in_future on edit');
select throws_ok($$update entries set time_zone = 'Nope/Nope' where id = '00000000-0000-0000-0000-000000000001'$$, 'P0001', 'time_zone_unknown', 'time_zone_unknown on edit');
select throws_like($$update entries set category_id = (select id from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1') where id = '00000000-0000-0000-0000-000000000001'$$, '%entry_tag_incomplete%', 'Tag fields all or none');

-- Settings, weekly_reviews
select throws_ok($$update settings set time_zone = 'Nope/Nope'$$, 'P0001', 'time_zone_unknown', 'time_zone_unknown on settings');
select lives_ok($$update settings set time_zone = 'Europe/Berlin'$$, 'settings time zone accepted');
select throws_like($$update settings set quiet_start = '07:00', quiet_end = '07:00'$$, '%quiet_hours_equal%', 'quiet_hours_equal');
select lives_ok($$update settings set quiet_start = '22:00', quiet_end = '06:00'$$, 'wrapping Quiet hours ok');
select throws_like($$insert into weekly_reviews (user_id, week_start) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-03')$$, '%week_start_not_monday%', 'week_start_not_monday');
select lives_ok($$insert into weekly_reviews (user_id, week_start) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-02')$$, 'Monday week_start ok');
select throws_ok($$insert into weekly_reviews (user_id, week_start) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-02')$$, '23505', null, 'one Review done per week');

-- Tag cleared on text edit unless tag_source = me
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, category_id, tag_source, tagged_at, suggested_category_id, tag_attempts, tagging_gave_up_at)
select '00000000-0000-0000-0000-000000000010', user_id, 'ai tagged', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), id, 'ai', now(), id, 2, now()
from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1';
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, category_id, tag_source, tagged_at, suggested_category_id, tag_attempts)
select '00000000-0000-0000-0000-000000000011', user_id, 'my tagged', now() - interval '3 hours', now() - interval '2 hours', 'UTC', now(), id, 'me', now(), id, 1
from categories where name = 'Deep' and user_id = '00000000-0000-0000-0000-0000000000a1';

update entries set text = 'changed' where id in ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011');
select results_eq($$select category_id is null, tag_source is null, tagged_at is null, suggested_category_id is null, tag_attempts, tagging_gave_up_at is null from entries where id = '00000000-0000-0000-0000-000000000010'$$,
  $$values (true, true, true, true, 0, true)$$, 'text edit clears AI Tag and bookkeeping');
select results_eq($$select category_id is not null, tag_source::text, tagged_at is not null, suggested_category_id is not null, tag_attempts from entries where id = '00000000-0000-0000-0000-000000000011'$$,
  $$values (true, 'me', true, true, 1)$$, 'text edit keeps a me Tag');

-- updated_at moves on every update
update entries set tag_attempts = 1 where id = '00000000-0000-0000-0000-000000000010';
select ok((select updated_at > created_at from entries where id = '00000000-0000-0000-0000-000000000010'), 'updated_at set on update');

select * from finish();
rollback;
