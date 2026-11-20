"use client";

import { useActionState } from "react";
import { createTask, type CreateTaskState } from "./actions";

const initialState: CreateTaskState = {
  attempt: 0,
  status: "idle",
  message: "",
  fields: { title: "", description: "", dueDate: "", assigneeId: "" },
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function CreateTaskForm({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createTask, initialState);
  const { fields } = state;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">สร้างงาน</h2>
      <form action={action} noValidate className="mt-4">
        <fieldset key={state.attempt} disabled={pending} className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold sm:col-span-2">
              ชื่องาน <span className="font-normal text-slate-600">(จำเป็น)</span>
              <input className={fieldClass} name="title" required defaultValue={fields.title} />
            </label>
            <label className="min-w-0 text-sm font-semibold sm:col-span-2">
              รายละเอียด <span className="font-normal text-slate-600">(ไม่บังคับ)</span>
              <textarea className={fieldClass} name="description" rows={3} defaultValue={fields.description} />
            </label>
            <label className="min-w-0 text-sm font-semibold">
              ผู้รับงาน <span className="font-normal text-slate-600">(จำเป็น)</span>
              <select
                className={fieldClass}
                name="assignee_id"
                required
                defaultValue={members.some(({ id }) => id === fields.assigneeId) ? fields.assigneeId : ""}
              >
                <option value="" disabled>เลือกสมาชิกในทีม</option>
                {members.map(({ id, name }) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold">
              วันกำหนดส่ง <span className="font-normal text-slate-600">(ไม่บังคับ)</span>
              <input className={fieldClass} type="date" name="due_date" defaultValue={fields.dueDate} />
            </label>
          </div>
          <button
            className="mt-5 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            type="submit"
          >
            {pending ? "กำลังสร้างงาน…" : "สร้างงาน"}
          </button>
        </fieldset>
        <p
          role="status"
          className={state.status === "error" ? "mt-2 text-red-800" : "mt-2 text-emerald-800"}
        >
          {pending ? "" : state.message}
        </p>
      </form>
    </section>
  );
}
