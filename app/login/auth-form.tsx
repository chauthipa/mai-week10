"use client";

import { useActionState } from "react";
import { submitAuth, type AuthFormMode } from "./actions";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const signingUp = mode === "signup";
  const [state, action, pending] = useActionState(submitAuth.bind(null, mode), {
    message: "",
    email: "",
    displayName: "",
  });

  return (
    <form action={action} noValidate className="mt-5">
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {signingUp && (
          <label className="block text-sm font-semibold">
            ชื่อที่แสดง
            <input className={fieldClass} name="displayName" autoComplete="nickname" required defaultValue={state.displayName} />
          </label>
        )}
        <label className="block text-sm font-semibold">
          อีเมล
          <input className={fieldClass} type="email" name="email" autoComplete="email" required defaultValue={state.email} />
        </label>
        <label className="block text-sm font-semibold">
          รหัสผ่าน
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete={signingUp ? "new-password" : "current-password"}
            aria-describedby={signingUp ? "password-hint" : undefined}
            minLength={signingUp ? 6 : undefined}
            required
          />
          {signingUp && <span id="password-hint" className="mt-1 block font-normal text-slate-600">อย่างน้อย 6 ตัวอักษร</span>}
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-800 px-4 py-2.5 font-semibold text-white hover:bg-blue-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {pending ? "กำลังดำเนินการ…" : signingUp ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </button>
      </fieldset>
      <p role="status" className="mt-3 text-sm text-red-800">
        {pending ? "" : state.message}
      </p>
    </form>
  );
}
