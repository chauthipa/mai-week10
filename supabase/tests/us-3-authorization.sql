-- Run in a workshop database after applying US-1 through US-3.
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
  team_b uuid;
  team_c uuid;
  task_a uuid;
  task_c uuid;
begin
  perform set_config('request.jwt.claim.sub', account_a::text, true);
  select team_id into team_a from public.team_members
  where user_id = account_a and role = 'leader';

  perform set_config('request.jwt.claim.sub', account_b::text, true);
  select team_id into team_b from public.team_members
  where user_id = account_b and role = 'member';

  perform set_config('request.jwt.claim.sub', account_c::text, true);
  select team_id into team_c from public.team_members
  where user_id = account_c and role = 'leader';

  if team_a is null or team_b is distinct from team_a or
     team_c is null or team_c = team_a then
    raise exception 'ตั้งค่าบัญชี A และ B ให้อยู่ทีมเดียวกัน และ C เป็นหัวหน้าอีกทีม';
  end if;

  -- AC-3.1: A can assign to B, and new tasks start in todo.
  perform set_config('request.jwt.claim.sub', account_a::text, true);
  insert into public.tasks (team_id, assignee_id, title)
  values (team_a, account_b, 'ทดสอบ US-3 ทีม A')
  returning id into task_a;

  if not exists (
    select 1 from public.tasks where id = task_a and status = 'todo' and created_by = account_a
  ) then
    raise exception 'AC-3.1: งานใหม่ต้องเริ่มที่ยังไม่เริ่มและระบุหัวหน้าที่สร้าง';
  end if;

  -- AC-3.4: a cross-team assignee must fail at the database.
  begin
    insert into public.tasks (team_id, assignee_id, title)
    values (team_a, account_c, 'ทดสอบมอบหมายข้ามทีม');
    raise exception 'AC-3.4: ฐานข้อมูลยอมให้มอบงานข้ามทีม';
  exception when foreign_key_violation then
    null;
  end;

  -- AC-3.3: B can read team work but cannot create it.
  perform set_config('request.jwt.claim.sub', account_b::text, true);
  if not exists (select 1 from public.tasks where id = task_a) then
    raise exception 'AC-3.3: สมาชิกทีมควรเห็นงานของทีมตนเอง';
  end if;
  begin
    insert into public.tasks (team_id, assignee_id, title)
    values (team_b, account_b, 'ทดสอบสิทธิ์สมาชิก');
    raise exception 'AC-3.3: ฐานข้อมูลยอมให้สมาชิกสร้างงาน';
  exception when insufficient_privilege then
    null;
  end;

  -- AC-3.7: each team's authenticated requests see only their own tasks.
  perform set_config('request.jwt.claim.sub', account_c::text, true);
  if exists (select 1 from public.tasks where id = task_a) then
    raise exception 'AC-3.7: C อ่านงานทีม A ได้';
  end if;
  insert into public.tasks (team_id, assignee_id, title)
  values (team_c, account_c, 'ทดสอบ US-3 ทีม C')
  returning id into task_c;

  perform set_config('request.jwt.claim.sub', account_a::text, true);
  if exists (select 1 from public.tasks where id = task_c) then
    raise exception 'AC-3.7: A อ่านงานทีม C ได้';
  end if;
end;
$$;

rollback;
