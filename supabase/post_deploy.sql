-- Hosted-only state that migrations can't hold. Run by .github/workflows/deploy.yml after each deploy.
-- Safe to re-run. The workflow replaces __JOB_SECRET__ (hex only) in a temporary copy.
-- One statement on purpose: `supabase db query` refuses more than one.

do $$
declare
  item record;
  found uuid;
begin
  for item in
    select * from (values
      ('job_secret', '__JOB_SECRET__'),
      ('tag_entries_url', 'https://naiiplbdydablbudaqzr.supabase.co/functions/v1/tag-entries'),
      ('send_notifications_url', 'https://naiiplbdydablbudaqzr.supabase.co/functions/v1/send-notifications'),
      ('insights_url', 'https://naiiplbdydablbudaqzr.supabase.co/functions/v1/insights')
    ) as t(name, value)
  loop
    select s.id into found from vault.secrets s where s.name = item.name;
    if found is null then
      perform vault.create_secret(item.value, item.name);
    else
      perform vault.update_secret(found, item.value);
    end if;
  end loop;

  -- Only accounts never seeded, so a later deploy can't bring back a Category I changed.
  perform public.seed_account(u.id)
  from auth.users u
  where not exists (select 1 from public.settings s where s.user_id = u.id);
end $$;
