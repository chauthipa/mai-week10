begin;

create schema if not exists private;
grant usage on schema private to authenticated;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '[^[:space:]]'),
  invite_code text not null unique check (invite_code ~ '^[A-Z]{6}$')
);

create table public.team_members (
  user_id uuid primary key references public.profiles (user_id),
  team_id uuid not null references public.teams (id),
  role text not null check (role in ('leader', 'member')),
  unique (team_id, user_id)
);

create unique index team_members_one_leader_idx
on public.team_members (team_id) where role = 'leader';

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on table public.teams, public.team_members from public, anon, authenticated;
grant select on table public.teams, public.team_members to authenticated;

create function private.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team_id
  from public.team_members
  where user_id = (select auth.uid());
$$;

create function private.is_team_leader(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = (select auth.uid())
      and team_id = target_team_id
      and role = 'leader'
  );
$$;

revoke all on function private.current_team_id(), private.is_team_leader(uuid)
from public, anon, authenticated;
grant execute on function private.current_team_id(), private.is_team_leader(uuid)
to authenticated;

create policy "Members can read their team"
on public.teams for select to authenticated
using (id = (select private.current_team_id()));

create policy "Members can read their teammates"
on public.team_members for select to authenticated
using (team_id = (select private.current_team_id()));

create policy "Members can read teammate profiles"
on public.profiles for select to authenticated
using (exists (
  select 1 from public.team_members as teammate
  where teammate.user_id = profiles.user_id
    and teammate.team_id = (select private.current_team_id())
));

create function public.create_team(name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  team_name text := regexp_replace($1, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  random_bytes bytea;
  candidate_code text;
  new_team_id uuid;
begin
  if caller_id is null then raise exception 'NOT_LOGGED_IN'; end if;
  if private.current_team_id() is not null then raise exception 'ALREADY_IN_TEAM'; end if;
  if coalesce(team_name, '') = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;

  loop
    -- Use six random UUID bytes. Discard bytes outside equal-sized letter buckets.
    random_bytes := uuid_send(gen_random_uuid());
    select string_agg(chr(65 + get_byte(random_bytes, byte_index) % 26), '' order by byte_index)
      into candidate_code
      from generate_series(0, 5) as bytes(byte_index)
      where get_byte(random_bytes, byte_index) < 234;
    if length(candidate_code) is distinct from 6 then continue; end if;

    insert into public.teams (name, invite_code)
    values (team_name, candidate_code)
    on conflict (invite_code) do nothing
    returning id into new_team_id;
    exit when new_team_id is not null;
  end loop;

  insert into public.team_members (user_id, team_id, role)
  values (caller_id, new_team_id, 'leader')
  on conflict (user_id) do nothing;
  if not found then raise exception 'ALREADY_IN_TEAM'; end if;

  return new_team_id;
end;
$$;

create function public.join_team(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_code text := upper(regexp_replace($1, '^[[:space:]]+|[[:space:]]+$', '', 'g'));
  joined_team_id uuid;
begin
  if caller_id is null then raise exception 'NOT_LOGGED_IN'; end if;
  if private.current_team_id() is not null then raise exception 'ALREADY_IN_TEAM'; end if;
  if normalized_code is null or normalized_code !~ '^[A-Z]{6}$' then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  select id into joined_team_id from public.teams as team
  where team.invite_code = normalized_code;
  if joined_team_id is null then raise exception 'TEAM_NOT_FOUND'; end if;

  insert into public.team_members (user_id, team_id, role)
  values (caller_id, joined_team_id, 'member')
  on conflict (user_id) do nothing;
  if not found then raise exception 'ALREADY_IN_TEAM'; end if;

  return joined_team_id;
end;
$$;

revoke all on function public.create_team(text), public.join_team(text)
from public, anon, authenticated;
grant execute on function public.create_team(text), public.join_team(text)
to authenticated;

commit;
