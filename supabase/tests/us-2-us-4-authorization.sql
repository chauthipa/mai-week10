-- Run in the workshop database after applying US-1 through US-4.
-- Replace the three UUIDs with the test accounts' User UIDs from Authentication.
-- A leads team 1, B is a member of team 1, and C leads team 2.
begin;
set local role authenticated;

do $$
declare
  account_a constant uuid := '00000000-0000-0000-0000-000000000001';
  account_b constant uuid := '00000000-0000-0000-0000-000000000002';
  account_c constant uuid := '00000000-0000-0000-0000-000000000003';
  team_a uuid;
  team_c uuid;
  invite_a text;
  task_for_a uuid;
  task_for_b uuid;
begin
  perform set_config('request.jwt.claim.sub', account_a::text, true);
  select team_id into strict team_a from public.team_members
  where user_id = account_a and role = 'leader';
  select invite_code into strict invite_a from public.teams where id = team_a;

  if not exists (select 1 from public.team_members where user_id = account_b and role = 'member')
     or not exists (select 1 from public.profiles where user_id = account_b) then
    raise exception 'ตั้งค่าบัญชี B ให้เป็นสมาชิกทีม A ก่อนทดสอบ';
  end if;

  -- AC-2.4: an existing member cannot create or join another team.
  begin
    perform public.create_team('ทดสอบสร้างทีมซ้ำ');
    raise exception 'AC-2.4: สร้างทีมซ้ำได้';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_IN_TEAM' then raise; end if;
  end;
  begin
    perform public.join_team(invite_a);
    raise exception 'AC-2.4: เข้าร่วมทีมซ้ำได้';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_IN_TEAM' then raise; end if;
  end;

  insert into public.tasks (team_id, assignee_id, title)
  values (team_a, account_a, 'ทดสอบสถานะ A') returning id into task_for_a;
  insert into public.tasks (team_id, assignee_id, title)
  values (team_a, account_b, 'ทดสอบสถานะ B') returning id into task_for_b;

  -- AC-4.2: A can update a task assigned to B.
  update public.tasks set status = 'in_progress' where id = task_for_b;
  if not found then raise exception 'AC-4.2: หัวหน้าแก้สถานะงานของสมาชิกไม่ได้'; end if;

  -- AC-4.1 and AC-4.3: B can change their task's status only.
  perform set_config('request.jwt.claim.sub', account_b::text, true);
  update public.tasks set status = 'done' where id = task_for_b;
  if not found then raise exception 'AC-4.1: ผู้รับงานแก้สถานะงานตัวเองไม่ได้'; end if;
  update public.tasks set status = 'done' where id = task_for_a;
  if found then raise exception 'AC-4.3: สมาชิกแก้สถานะงานคนอื่นได้'; end if;

  -- AC-4.4: even a request that includes a valid status must reject other edits.
  begin
    update public.tasks
    set status = 'todo', title = 'ทดสอบแก้ชื่อ', description = 'ทดสอบแก้รายละเอียด',
        due_date = current_date, assignee_id = account_a
    where id = task_for_b;
    raise exception 'AC-4.4: ผู้รับงานส่งคำขอแก้ข้อมูลงานได้';
  exception when insufficient_privilege then
    if sqlerrm <> 'ONLY_STATUS_ALLOWED' then raise; end if;
  end;

  -- AC-2.6: the leader of team C can read their team but not team A's data.
  perform set_config('request.jwt.claim.sub', account_c::text, true);
  select team_id into strict team_c from public.team_members
  where user_id = account_c and role = 'leader';
  if team_c = team_a or not exists (select 1 from public.teams where id = team_c) then
    raise exception 'ตั้งค่าบัญชี C ให้เป็นหัวหน้าอีกทีมก่อนทดสอบ';
  end if;
  if exists (select 1 from public.teams where id = team_a)
     or exists (select 1 from public.team_members where team_id = team_a)
     or exists (select 1 from public.profiles where user_id in (account_a, account_b)) then
    raise exception 'AC-2.6: คนนอกทีมอ่านข้อมูลทีม A ได้';
  end if;

  -- AC-3.4: the same-team constraint still applies to leader updates.
  perform set_config('request.jwt.claim.sub', account_a::text, true);
  begin
    update public.tasks set assignee_id = account_c where id = task_for_b;
    raise exception 'AC-3.4: หัวหน้าเปลี่ยนผู้รับงานเป็นคนนอกทีมได้';
  exception when foreign_key_violation then
    null;
  end;
end;
$$;

rollback;
