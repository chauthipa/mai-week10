"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readAccount } from "@/lib/supabase/auth";

const teamErrors: Record<string, string> = {
  ALREADY_IN_TEAM: "คุณมีทีมอยู่แล้ว",
  TEAM_NAME_REQUIRED: "กรุณากรอกชื่อทีม",
  TEAM_NOT_FOUND: "ไม่พบทีมจากรหัสนี้",
};

export async function submitTeam(
  operation: "create" | "join",
  _previous: string,
  formData: FormData,
): Promise<string> {
  const account = await readAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "unavailable") return "ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";

  const input = formData.get("value");
  const value = typeof input === "string" ? input.trim() : "";
  const { error } = operation === "create"
    ? await account.supabase.rpc("create_team", { name: value })
    : await account.supabase.rpc("join_team", { invite_code: value });

  if (error) {
    return teamErrors[error.message] ?? "บันทึกทีมไม่สำเร็จ กรุณาลองใหม่";
  }

  revalidatePath("/team");
  revalidatePath("/tasks");
  redirect("/team");
}
