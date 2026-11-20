import Link from "next/link";
import { redirect } from "next/navigation";
import { readAccount } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { AuthForm } from "./auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ mode: modeParam }, account] = await Promise.all([searchParams, readAccount()]);
  if (account.status === "signed-in") redirect("/team");

  const signingUp = modeParam === "signup";
  const mode = signingUp ? "signup" : "login";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h1 className="text-2xl font-bold text-slate-900">
          {signingUp ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </h1>
        {hasSupabaseConfig ? (
          <AuthForm key={mode} mode={mode} />
        ) : (
          <p role="alert" className="mt-4 text-red-800">ยังเชื่อมต่อ Supabase ไม่ได้ กรุณาตรวจการตั้งค่า</p>
        )}
        <p className="mt-4 text-sm text-slate-700">
          {signingUp ? "มีบัญชีแล้ว " : "ยังไม่มีบัญชี "}
          <Link
            href={signingUp ? "/login" : "/login?mode=signup"}
            className="font-semibold text-blue-800 underline underline-offset-2"
          >
            {signingUp ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Link>
        </p>
      </section>
    </main>
  );
}
