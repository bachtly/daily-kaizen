-- F1 schema: enums, tables, checks, triggers, indexes, seed_account().
-- Error keys (04-api Errors) are check constraint names or trigger exception messages.
-- RLS, grants and rpcs come in later migrations.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create type public.tag_source as enum ('ai', 'me');
create type public.category_status as enum ('active', 'suggested', 'rejected');
create type public.notification_kind as enum ('nudge', 'review_reminder');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null,
  status public.category_status not null default 'active'
);
create unique index categories_user_name_key on public.categories (user_id, lower(name));

create table public.entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  time_zone text not null,
  form_opened_at timestamptz not null,
  category_id uuid references public.categories (id) on delete restrict,
  tag_source public.tag_source,
  tagged_at timestamptz,
  suggested_category_id uuid references public.categories (id) on delete restrict,
  tag_attempts int not null default 0,
  tagging_gave_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entry_text_empty check (btrim(text) <> ''),
  constraint entry_end_not_after_start check (ended_at > started_at),
  constraint entry_tag_incomplete check (num_nonnulls(category_id, tag_source, tagged_at) in (0, 3))
);

-- Access patterns (03-data-model)
create index entries_untagged_idx on public.entries (created_at)
  where category_id is null and tagging_gave_up_at is null;
create index entries_user_ended_at_idx on public.entries (user_id, ended_at);
create index entries_suggested_category_idx on public.entries (suggested_category_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  time_zone text,
  quiet_start time not null default '23:00',
  quiet_end time not null default '07:00',
  constraint quiet_hours_equal check (quiet_start <> quiet_end)
);

create table public.weekly_reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  done_at timestamptz not null default now(),
  primary key (user_id, week_start),
  constraint week_start_not_monday check (extract(isodow from week_start) = 1)
);

create table public.notifications_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  about text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, about)
);

-- Triggers ------------------------------------------------------------------

create function public.entries_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

create trigger entries_set_updated_at before update on public.entries
  for each row execute function public.entries_set_updated_at();

-- A text change clears the Tag unless tag_source = me (AC-3.2, AC-3.3).
create function public.entries_clear_tag_on_text_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.text is distinct from old.text and old.tag_source is distinct from 'me' then
    new.category_id := null;
    new.tag_source := null;
    new.tagged_at := null;
    new.suggested_category_id := null;
    new.tag_attempts := 0;
    new.tagging_gave_up_at := null;
  end if;
  return new;
end $$;

create trigger entries_clear_tag_on_text_edit before update of text on public.entries
  for each row execute function public.entries_clear_tag_on_text_edit();

-- ended_at at most 5 min after Server now, checked on insert and when ended_at changes.
create function public.entries_check_end_not_in_future() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.ended_at is distinct from old.ended_at)
     and new.ended_at > clock_timestamp() + interval '5 minutes' then
    raise exception 'entry_end_in_future';
  end if;
  return new;
end $$;

create trigger entries_check_end_not_in_future before insert or update on public.entries
  for each row execute function public.entries_check_end_not_in_future();

-- time_zone must be an IANA name Postgres knows (entries, and settings when set).
create function public.check_time_zone_known() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.time_zone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'time_zone_unknown';
  end if;
  return new;
end $$;

create trigger entries_check_time_zone before insert or update of time_zone on public.entries
  for each row execute function public.check_time_zone_known();
create trigger settings_check_time_zone before insert or update of time_zone on public.settings
  for each row execute function public.check_time_zone_known();

-- Account seed: run once from the SQL editor as postgres: select seed_account('<uid>');
create function public.seed_account(uid uuid) returns void
language sql set search_path = '' as $$
  insert into public.settings (user_id) values (uid) on conflict do nothing;
  insert into public.categories (user_id, name, description) values
    (uid, 'Deep', 'Focused, demanding work or learning that builds skill or produces something valuable, such as building a hard feature, studying a new topic or writing a design doc.'),
    (uid, 'Shallow', 'Necessary work that needs little focus and is easy to interrupt, such as email and chat, quick admin or routine status meetings.'),
    (uid, 'Maintenance', 'Chores and logistics that keep life running, such as cooking, cleaning, shopping, errands or commuting.'),
    (uid, 'Waste', 'Time spent without intent that I wouldn''t choose again, such as doomscrolling, aimless YouTube or switching between apps without doing anything.'),
    (uid, 'Recovery', 'Deliberate rest that restores energy, such as sleep, a workout or walk, or a relaxed meal with friends. Entertainment chosen on purpose counts here; the same done aimlessly is Waste.')
  on conflict do nothing;
$$;
revoke execute on function public.seed_account(uuid) from public, anon, authenticated;
