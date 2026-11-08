-- Tagging: helpers for the tag-entries Edge Function and the insert trigger that calls it.
-- Helpers are internal: service_role only. Contract is fixed by supabase/functions/tag-entries/types.ts.

-- Oldest first, max 20, created over 2 min ago, not given up (AC-3.2).
create function public.untagged_due() returns setof public.entries
language sql stable security definer set search_path = '' as $$
  select * from public.entries e
  where e.category_id is null
    and e.tagging_gave_up_at is null
    and e.created_at < now() - interval '2 minutes'
  order by e.created_at
  limit 20;
$$;

-- One transaction: guard first (so a miss inserts nothing), then the Suggested category, then the Tag.
-- Returns true only when a new Suggested category was inserted.
create function public.save_ai_tag(
  p_entry_id uuid,
  p_read_updated_at timestamptz,
  p_category_id uuid,
  p_proposed_name text,
  p_proposed_description text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_new_id uuid;
  v_suggested uuid;
  v_status public.category_status;
begin
  select e.user_id into v_user from public.entries e
    where e.id = p_entry_id
      and e.tag_source is distinct from 'me'
      and e.updated_at = p_read_updated_at
    for update;
  if not found then
    return false;
  end if;

  perform 1 from public.categories c
    where c.id = p_category_id and c.user_id = v_user and c.status = 'active';
  if not found then
    raise exception 'category_not_active';
  end if;

  if p_proposed_name is not null then
    insert into public.categories (user_id, name, description, status)
      values (v_user, p_proposed_name, coalesce(p_proposed_description, ''), 'suggested')
      on conflict do nothing
      returning id into v_new_id;
    v_suggested := v_new_id;
    if v_new_id is null then
      -- Name already exists: link the Entry only to a still-Suggested category.
      select c.id, c.status into v_suggested, v_status from public.categories c
        where c.user_id = v_user and lower(c.name) = lower(p_proposed_name);
      if v_status is distinct from 'suggested' then
        v_suggested := null;
      end if;
    end if;
  end if;

  update public.entries e
    set category_id = p_category_id, tag_source = 'ai', tagged_at = now(),
        suggested_category_id = v_suggested, tag_attempts = 0, tagging_gave_up_at = null
    where e.id = p_entry_id;

  return v_new_id is not null;
end $$;

-- Failed AI call: guarded attempts + 1; give up at 3 (AC-3.2).
create function public.record_tag_failure(p_entry_id uuid, p_read_updated_at timestamptz) returns void
language sql security definer set search_path = '' as $$
  update public.entries e
    set tag_attempts = e.tag_attempts + 1,
        tagging_gave_up_at = case when e.tag_attempts + 1 >= 3 then now() else e.tagging_gave_up_at end
    where e.id = p_entry_id
      and e.tag_source is distinct from 'me'
      and e.updated_at = p_read_updated_at;
$$;

revoke execute on function public.untagged_due() from public, anon, authenticated;
revoke execute on function public.save_ai_tag(uuid, timestamptz, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.record_tag_failure(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.untagged_due() to service_role;
grant execute on function public.save_ai_tag(uuid, timestamptz, uuid, text, text) to service_role;
grant execute on function public.record_tag_failure(uuid, timestamptz) to service_role;

-- Insert trigger: tell tag-entries about the new Entry via pg_net (2 s timeout, no retry).
-- Vault secrets: job_secret, tag_entries_url. Missing config or any error only warns, never fails the insert.
create function public.entries_notify_tagging() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text;
begin
  begin
    select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'job_secret';
    select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = 'tag_entries_url';
    if v_secret is null or v_url is null then
      return new;
    end if;
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('entry_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', v_secret),
      timeout_milliseconds := 2000);
  exception when others then
    raise warning 'entries_notify_tagging failed: %', sqlerrm;
  end;
  return new;
end $$;

revoke execute on function public.entries_notify_tagging() from public, anon, authenticated;

create trigger entries_notify_tagging after insert on public.entries
  for each row execute function public.entries_notify_tagging();
