import Link from "next/link";
import { hasSupabaseConfig, hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// ตรวจสถานะใหม่ทุกครั้งที่เปิดหน้า ไม่จำผลไว้ตอน build
export const dynamic = "force-dynamic";

type Status = { ok: boolean; title: string; detail: string };

const connectionError: Status = {
  ok: false,
  title: "เชื่อม Supabase ไม่สำเร็จ",
  detail:
    "ตรวจ Project URL และ Publishable key ใน .env.local รวมถึงสถานะโปรเจกต์ใน Supabase แล้วหยุดและรัน npm run dev ใหม่",
};

// ตรวจว่าเชื่อม Supabase ได้หรือยัง เพื่อให้ผู้เรียนรู้ว่าตั้งค่าครบแล้ว
async function checkSupabase(): Promise<Status> {
  if (!hasSupabaseEnv) {
    return {
      ok: false,
      title: "ยังไม่ได้ใส่ค่าใน .env.local",
      detail:
        "คัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่ Project URL และ Publishable key จาก Supabase จากนั้นหยุดแล้วรัน npm run dev ใหม่",
    };
  }

  if (!hasSupabaseConfig) return connectionError;

  const supabase = await createClient();
  // ขอผลลัพธ์ 0 แถว แต่ให้ Supabase ส่งรหัสข้อผิดพลาดกลับมาถ้ายังไม่มีตาราง
  const { error } = await supabase.from("profiles").select("user_id").limit(0);

  // Anonymous visitors cannot read profiles. A permission error still confirms
  // that Supabase responded to the request for this table.
  if (!error || error.code === "42501") {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ และพบตาราง profiles แล้ว",
      detail: "เปิดหน้าเข้าสู่ระบบเพื่อสมัครบัญชีหรือเข้าสู่ระบบ",
    };
  }

  const missingTable = error.code === "PGRST205" || error.code === "42P01";

  if (missingTable) {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ",
      detail:
        "ยังไม่มีตาราง profiles ให้รันไฟล์สร้างตารางของ US-1 ใน Supabase SQL Editor ก่อนสมัครบัญชี",
    };
  }

  return connectionError;
}

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">
        โปรเจกต์ตั้งต้นสำหรับ workshop สร้างระบบด้วย Codex
      </p>

      <section
        className={`mt-8 rounded-2xl border p-6 ${
          status.ok
            ? "border-emerald-300 bg-emerald-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-sm font-semibold">
          {status.ok ? "สถานะ: พร้อม" : "สถานะ: ยังไม่พร้อม"}
        </p>
        <h2 className="mt-1 text-xl font-bold">{status.title}</h2>
        <p className="mt-2 text-slate-700">{status.detail}</p>
      </section>

      <Link
        href="/login"
        className="mt-6 inline-flex rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900"
      >
        เข้าสู่ระบบหรือสมัครสมาชิก
      </Link>
    </main>
  );
}
