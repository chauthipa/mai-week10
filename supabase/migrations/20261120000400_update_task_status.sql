begin;

grant update (status, title, description, due_date, assignee_id)
on table public.tasks to authenticated;

create policy "Leaders and assignees can update their tasks"
on public.tasks for update to authenticated
using (
  team_id = (select private.current_team_id())
  and (private.is_team_leader(team_id) or assignee_id = (select auth.uid()))
)
with check (
  team_id = (select private.current_team_id())
  and (private.is_team_leader(team_id) or assignee_id = (select auth.uid()))
);

create function private.require_leader_for_task_details()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_team_leader(old.team_id) then
    raise insufficient_privilege using message = 'ONLY_STATUS_ALLOWED';
  end if;
  return new;
end;
$$;

revoke all on function private.require_leader_for_task_details()
from public, anon, authenticated;

create trigger require_leader_for_task_details
before update of title, description, due_date, assignee_id on public.tasks
for each row execute function private.require_leader_for_task_details();

commit;
