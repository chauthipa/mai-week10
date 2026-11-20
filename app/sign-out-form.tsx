"use client";

import { useActionState } from "react";
import { signOut } from "./login/actions";

export function SignOutForm() {
  const [message, action, pending] = useActionState(signOut, "");

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
      </button>
      <p role="status" className="text-sm text-red-800">{message}</p>
    </form>
  );
}
