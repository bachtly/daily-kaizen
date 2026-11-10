-- Sign-ups are on: every new auth user gets settings and the 5 Categories at once,
-- instead of waiting for post_deploy.sql to seed them on the next deploy.
create function public.seed_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_account(new.id);
  return new;
end;
$$;
revoke execute on function public.seed_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.seed_new_user();
