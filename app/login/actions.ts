"use server";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthFormMode = "login" | "signup";
export type AuthFormState = {
  message: string;
  email: string;
  displayName: string;
};

export async function submitAuth(
  mode: AuthFormMode,
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const emailField = formData.get("email");
  const nameField = formData.get("displayName");
  const password = formData.get("password");
  const email = typeof emailField === "string" ? emailField.trim() : "";
  const displayName = typeof nameField === "string" ? nameField.trim() : "";
  const failure = (message: string) => ({ message, email, displayName });

  if (!hasSupabaseConfig) return failure("ยังเชื่อมต่อ Supabase ไม่ได้");
  if (mode !== "login" && mode !== "signup") return failure("กรุณาลองใหม่");
  if (mode === "signup" && !displayName) return failure("กรุณากรอกชื่อที่แสดง");
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return failure("กรุณากรอกอีเมลให้ถูกต้อง");
  if (typeof password !== "string" || !password) return failure("กรุณากรอกรหัสผ่าน");
  if (mode === "signup" && Array.from(password).length < 6) {
    return failure("กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร");
  }

  const supabase = await createClient();
  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === "invalid_credentials") return failure("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    if (error?.code === "email_not_confirmed") return failure("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
    if (error) return failure("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error?.code === "weak_password") return failure("กรุณาใช้รหัสผ่านที่คาดเดายากขึ้น");
    if (error) return failure("สมัครสมาชิกไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่");
    if (!data.session) return failure("กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
  }

  redirect("/team");
}

export async function signOut(): Promise<string> {
  if (!hasSupabaseConfig) return "ยังเชื่อมต่อ Supabase ไม่ได้";

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่";

  redirect("/login");
}
