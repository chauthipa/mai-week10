"use client";

import { useActionState } from "react";
import { updateTaskStatus } from "./actions";
import { taskStatuses } from "./status";

export function TaskStatusForm({ taskId, status }: { taskId: string; status: string }) {
  const [message, action, pending] = useActionState(updateTaskStatus.bind(null, taskId), "");

  return (
    <form action={action} className="mt-4 border-t border-slate-200 pt-3">
      <fieldset disabled={pending} className="flex min-w-0 flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
          สถานะงาน
          <select
            name="status"
            defaultValue={status}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {taskStatuses.map(({ status, name }) => <option key={status} value={status}>{name}</option>)}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : "บันทึกสถานะ"}
        </button>
      </fieldset>
      {message && !pending && <p role="status" className="mt-2 text-sm text-red-800">{message}</p>}
    </form>
  );
}
