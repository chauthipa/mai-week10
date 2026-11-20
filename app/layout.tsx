import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/noto-sans-thai";
import { readAccount } from "@/lib/supabase/auth";
import { SignOutForm } from "./sign-out-form";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบติดตามงานทีม",
  description: "Workshop: สร้างระบบด้วย Codex",
};

async function AccountHeader() {
  const account = await readAccount();
  if (account.status !== "signed-in") return null;

  const { data: profile } = await account.supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", account.user.id)
    .maybeSingle();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/team" className="font-bold text-blue-900">ระบบติดตามงานทีม</Link>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-2">
          <span className="min-w-0 text-sm text-slate-700 wrap-anywhere">
            {profile?.display_name ?? "ไม่พบชื่อที่แสดง"}
          </span>
          <SignOutForm />
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-800">
        <AccountHeader />
        {children}
      </body>
    </html>
  );
}
