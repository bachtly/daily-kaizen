-- Switch-on: schedules the Tagging check and the Notification check, plus the nfr_report view.
-- Vault secrets read here (set by hand, see the PR's human steps): job_secret, tag_entries_url,
-- send_notifications_url. Until they exist every run is a quiet no-op.

-- POSTs `{}` with the job secret to the function URL stored in Vault under p_url_secret.
create function public.post_job(p_url_secret text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text;
begin
  begin
    select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'job_secret';
    select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = p_url_secret;
    if v_secret is null or v_url is null then
      return;
    end if;
    perform net.http_post(
      url := v_url,
      body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', v_secret),
      timeout_milliseconds := 2000);
  exception when others then
    raise warning 'post_job(%) failed: %', p_url_secret, sqlerrm;
  end;
end $$;

revoke execute on function public.post_job(text) from public, anon, authenticated;

-- pg_cron runs these as the migration owner. Scheduling by name makes a re-run replace the job.
select cron.schedule('tagging-check', '*/15 * * * *', $$select public.post_job('tag_entries_url')$$);
select cron.schedule('notification-check', '*/5 * * * *', $$select public.post_job('send_notifications_url')$$);

-- Observability (06-backend): one row per Entry. Read from the SQL editor as postgres.
--   save_delay  = created_at - form_opened_at   (NFR-1, <= 15 s for 9 of 10)
--   tag_delay   = tagged_at - created_at for AI Tags never corrected (NFR-4, 95% <= 30 min);
--                 a correction sets tag_source = 'me', so those rows are null
--   gave_up     = tagging failed 3 times (any row -> look at function logs)
create view public.nfr_report with (security_invoker = true) as
select e.id,
       e.user_id,
       e.created_at,
       e.created_at - e.form_opened_at as save_delay,
       case when e.tag_source = 'ai' then e.tagged_at - e.created_at end as tag_delay,
       e.tagging_gave_up_at is not null as gave_up
from public.entries e;

revoke all on public.nfr_report from public, anon, authenticated;
