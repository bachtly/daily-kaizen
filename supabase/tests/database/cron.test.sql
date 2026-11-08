begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
select seed_account('00000000-0000-0000-0000-0000000000a1');

-- Jobs
select is((select schedule from cron.job where jobname = 'tagging-check'), '*/15 * * * *', 'Tagging check every 15 min');
select is((select schedule from cron.job where jobname = 'notification-check'), '*/5 * * * *', 'Notification check every 5 min');
select is((select command from cron.job where jobname = 'tagging-check'), 'select public.post_job(''tag_entries_url'')', 'Tagging check posts to tag_entries_url');
select is((select command from cron.job where jobname = 'notification-check'), 'select public.post_job(''send_notifications_url'')', 'Notification check posts to send_notifications_url');
select is((select count(*)::int from cron.job where jobname in ('tagging-check', 'notification-check') and active), 2, 'both jobs active');

-- post_job
select ok(not has_function_privilege('authenticated', 'public.post_job(text)', 'execute')
  and not has_function_privilege('anon', 'public.post_job(text)', 'execute'), 'post_job not executable by app roles');
select is_empty($$select * from net.http_request_queue$$, 'queue starts empty');
select lives_ok($$select public.post_job('tag_entries_url')$$, 'no Vault config: quiet no-op');
select is_empty($$select * from net.http_request_queue$$, 'nothing queued without config');

select vault.create_secret('s3cret', 'job_secret');
select vault.create_secret('https://example.test/functions/v1/send-notifications', 'send_notifications_url');
select lives_ok($$select public.post_job('send_notifications_url')$$, 'posts with config');
select is((select count(*)::int from net.http_request_queue where url = 'https://example.test/functions/v1/send-notifications'
  and body = convert_to('{}', 'UTF8') and headers ->> 'x-job-secret' = 's3cret'), 1, 'queued `{}` with the job secret');
select lives_ok($$select public.post_job('tag_entries_url')$$, 'one missing URL is a no-op');
select vault.update_secret((select id from vault.secrets where name = 'send_notifications_url'), 'not-a-url');
select lives_ok($$select public.post_job('send_notifications_url')$$, 'a pg_net error only warns');

-- nfr_report
insert into entries (id, user_id, text, started_at, ended_at, time_zone, form_opened_at, category_id, tag_source, tagged_at, created_at)
select '00000000-0000-0000-0000-000000000001', user_id, 'a', '2024-11-12 07:00+00', '2024-11-12 08:00+00', 'UTC',
       '2024-11-12 08:00:00+00', id, 'ai', '2024-11-12 08:10:05+00', '2024-11-12 08:00:05+00'
from categories where name = 'Deep';
select columns_are('public', 'nfr_report', array['id', 'user_id', 'created_at', 'save_delay', 'tag_delay', 'gave_up'], 'nfr_report columns');
select results_eq($$select save_delay::text, tag_delay::text, gave_up from nfr_report$$, $$values ('00:00:05', '00:10:00', false)$$, 'delays computed for an AI Tag');
update entries set tag_source = 'me';
select is((select tag_delay from nfr_report), null, 'a corrected Tag has no tag_delay');
select ok(not has_table_privilege('anon', 'public.nfr_report', 'select') and not has_table_privilege('authenticated', 'public.nfr_report', 'select')
  and (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.nfr_report'::regclass), 'nfr_report is security_invoker with no app-role access');

select * from finish();
rollback;
