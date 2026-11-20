begin;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (display_name ~ '[^[:space:]]'),
  email text not null
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()));

create function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.email is not distinct from old.email then
      return new;
    end if;
  end if;

  if new.email is null then
    if tg_op = 'UPDATE' and exists (
      select 1 from public.profiles where user_id = new.id
    ) then
      raise exception 'An email is required for this account';
    end if;
    return new;
  end if;

  insert into public.profiles (user_id, display_name, email)
  values (
    new.id,
    coalesce(nullif(regexp_replace(
      new.raw_user_meta_data ->> 'display_name',
      '^[[:space:]]+|[[:space:]]+$', '', 'g'
    ), ''), 'ผู้ใช้'),
    new.email
  )
  on conflict (user_id) do update set email = excluded.email;

  return new;
end;
$$;

revoke all on function public.sync_auth_profile() from public, anon, authenticated;

create trigger sync_auth_profile
after insert or update of email on auth.users
for each row execute function public.sync_auth_profile();

-- Give existing email accounts a profile while keeping their original auth IDs.
insert into public.profiles (user_id, display_name, email)
select
  id,
  coalesce(nullif(regexp_replace(
    raw_user_meta_data ->> 'display_name',
    '^[[:space:]]+|[[:space:]]+$', '', 'g'
  ), ''), 'ผู้ใช้'),
  email
from auth.users
where email is not null;

commit;
