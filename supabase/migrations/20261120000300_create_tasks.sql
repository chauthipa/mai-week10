begin;

-- US-3 depends on the profiles and membership schema from US-1 and US-2.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  assignee_id uuid not null,
  created_by uuid not null default auth.uid(),
  title text not null constraint tasks_title_not_blank check (title ~ '[^[:space:]]'),
  description text,
  due_date date check (due_date between date '0001-01-01' and date '9999-12-31'),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  constraint tasks_assignee_in_team foreign key (team_id, assignee_id)
    references public.team_members (team_id, user_id),
  constraint tasks_creator_in_team foreign key (team_id, created_by)
    references public.team_members (team_id, user_id)
);

create index tasks_team_id_id_idx on public.tasks (team_id, id);
create index tasks_team_id_assignee_id_idx on public.tasks (team_id, assignee_id);
create index tasks_team_id_created_by_idx on public.tasks (team_id, created_by);

alter table public.tasks enable row level security;
revoke all on table public.tasks from public, anon, authenticated;
grant select on table public.tasks to authenticated;
grant insert (team_id, assignee_id, title, description, due_date)
  on table public.tasks to authenticated;

create policy "Team members can read their tasks"
on public.tasks for select
to authenticated
using (team_id = (select private.current_team_id()));

create policy "Team leaders can create tasks for their team"
on public.tasks for insert
to authenticated
with check (
  team_id = (select private.current_team_id())
  and private.is_team_leader(team_id)
  and created_by = (select auth.uid())
  and status = 'todo'
);

commit;
