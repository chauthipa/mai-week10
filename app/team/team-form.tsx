"use client";

import { useActionState } from "react";
import { submitTeam } from "./actions";

export function TeamForm({ operation }: { operation: "create" | "join" }) {
  const [message, action, pending] = useActionState(submitTeam.bind(null, operation), "");
  const creating = operation === "create";
  const label = creating ? "สร้างทีม" : "เข้าร่วมทีม";

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">{label}</h2>
      <form action={action} noValidate className="mt-4">
        <fieldset disabled={pending} className="min-w-0">
          <label className="block text-sm font-semibold">
            {creating ? "ชื่อทีม" : "รหัสเชิญ"}
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              autoComplete="off"
              autoCapitalize={creating ? undefined : "characters"}
              name="value"
              required
            />
          </label>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : label}
          </button>
        </fieldset>
        <p role="status" className="mt-2 text-sm text-red-800">{pending ? "" : message}</p>
      </form>
    </section>
  );
}
