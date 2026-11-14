begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is((select schedule from cron.job where jobname = 'insights-check'), '5 * * * *', 'Insights check hourly at :05');
select is((select command from cron.job where jobname = 'insights-check'), 'select public.post_job(''insights_url'')', 'posts to insights_url');
select ok((select active from cron.job where jobname = 'insights-check'), 'active');

select * from finish();
rollback;
