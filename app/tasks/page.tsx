import Link from "next/link";
import { redirect } from "next/navigation";
import { readAccount } from "@/lib/supabase/auth";
import { readAllPages, readMembership, readTeamMembers } from "@/lib/supabase/team";
import { CreateTaskForm } from "./create-task-form";
import { bangkokDay, taskStatuses } from "./status";
import { TaskStatusForm } from "./task-status-form";

export const dynamic = "force-dynamic";

const thaiDate = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

function TasksUnavailable({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">งานของทีม</h1>
      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
        {message}
      </p>
    </main>
  );
}

export default async function TasksPage() {
  const account = await readAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "unavailable") {
    return <TasksUnavailable message="ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" />;
  }
  const { supabase, user } = account;

  const { data: membership, error: membershipError } = await readMembership(
    supabase,
    user.id,
  );
  if (membershipError) {
    return <TasksUnavailable message="โหลดข้อมูลทีมไม่สำเร็จ กรุณาลองใหม่" />;
  }
  if (!membership) redirect("/team");

  const [tasks, teamMembers] = await Promise.all([
    readAllPages(
      (after) => {
        const query = supabase.from("tasks")
          .select("id, assignee_id, title, description, due_date, status, created_at")
          .eq("team_id", membership.team_id)
          .order("id")
          .limit(500);
        return after ? query.gt("id", after) : query;
      },
      (task) => task.id,
    ),
    readTeamMembers(supabase, membership.team_id),
  ]);

  if (!tasks || !teamMembers || teamMembers.some(({ profile }) => !profile)) {
    return <TasksUnavailable message="โหลดงานหรือรายชื่อสมาชิกไม่สำเร็จ กรุณาลองใหม่" />;
  }

  const members = teamMembers
    .map(({ user_id, profile }) => ({ id: user_id, name: profile?.display_name ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
  const memberNames = new Map(members.map(({ id, name }) => [id, name]));
  tasks.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const isLeader = membership.role === "leader";
  const today = bangkokDay(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">งานของทีม</h1>
        <Link href="/team" className="rounded-md px-2 py-1 font-semibold text-blue-800 hover:underline">
          ทีมของฉัน
        </Link>
      </header>
      {isLeader && <CreateTaskForm members={members} />}
      {tasks.length === 0 && <p className="text-slate-600">ยังไม่มีงานในทีม</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {taskStatuses.map(({ status, name }) => {
          const items = tasks.filter((task) => task.status === status);
          return (
            <section key={status} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/75 p-4">
              <h2 className="font-bold text-slate-900">{name}</h2>
              {items.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {items.map((task) => (
                    <li key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 wrap-anywhere">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="min-w-0 font-semibold text-slate-900">{task.title}</h3>
                        {task.due_date && task.due_date < today && status !== "done" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">เลยกำหนด</span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>
                      )}
                      <p className="mt-3 text-sm text-slate-700">
                        ผู้รับงาน {memberNames.get(task.assignee_id) ?? "ไม่พบชื่อสมาชิก"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        กำหนดส่ง{" "}
                        {task.due_date ? (
                          <time dateTime={task.due_date}>
                            {thaiDate.format(new Date(`${task.due_date}T00:00:00Z`))}
                          </time>
                        ) : "ไม่มีกำหนด"}
                      </p>
                      {(isLeader || task.assignee_id === user.id) && (
                        <TaskStatusForm key={status} taskId={task.id} status={status} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
