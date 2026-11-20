import Link from "next/link";
import { redirect } from "next/navigation";
import { readAccount } from "@/lib/supabase/auth";
import { readMembership, readTeamMembers } from "@/lib/supabase/team";
import { TeamForm } from "./team-form";

async function TeamContent() {
  const account = await readAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "unavailable") {
    return <p role="alert" className="mt-4 text-red-800">ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่</p>;
  }

  const { supabase, user } = account;
  const { data: membership, error } = await readMembership(supabase, user.id);
  const loadError = <p role="alert" className="mt-4 text-red-800">โหลดข้อมูลทีมไม่สำเร็จ กรุณาลองใหม่</p>;
  if (error) return loadError;

  if (!membership) {
    return (
      <>
        <p className="mt-4 text-slate-600">คุณยังไม่มีทีม</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TeamForm operation="create" />
          <TeamForm operation="join" />
        </div>
      </>
    );
  }

  const [{ data: team, error: teamError }, members] = await Promise.all([
    supabase.from("teams").select("name, invite_code").eq("id", membership.team_id).single(),
    readTeamMembers(supabase, membership.team_id),
  ]);
  if (teamError || !team || !members?.length || members.some(({ profile }) => !profile)) {
    return loadError;
  }

  members.sort((a, b) =>
    Number(b.role === "leader") - Number(a.role === "leader") ||
    (a.profile?.display_name ?? "").localeCompare(b.profile?.display_name ?? "", "th"),
  );

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-xl font-bold text-slate-900 wrap-anywhere">{team.name}</h2>
        <Link href="/tasks" className="font-semibold text-blue-800 underline underline-offset-2">ดูงานของทีม</Link>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        รหัสเชิญ <code className="ml-1 rounded-md bg-slate-100 px-2 py-1 font-bold tracking-wider">{team.invite_code}</code>
      </p>
      <h3 className="mt-6 font-bold text-slate-900">สมาชิกในทีม</h3>
      <ul className="mt-2 divide-y divide-slate-200">
        {members.map(({ user_id, profile, role }) => (
          <li key={user_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
            <span className="min-w-0 wrap-anywhere">{profile?.display_name}</span>
            <span className="text-sm text-slate-600">{role === "leader" ? "หัวหน้า" : "สมาชิก"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TeamPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-slate-900">ทีมของฉัน</h1>
      <TeamContent />
    </main>
  );
}
