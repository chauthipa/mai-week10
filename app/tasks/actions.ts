"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readAccount } from "@/lib/supabase/auth";
import { readMembership } from "@/lib/supabase/team";
import { taskStatuses } from "./status";

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export type CreateTaskState = {
  attempt: number;
  status: "idle" | "error" | "success";
  message: string;
  fields: {
    title: string;
    description: string;
    dueDate: string;
    assigneeId: string;
  };
};

export async function createTask(
  previous: CreateTaskState,
  formData: FormData,
): Promise<CreateTaskState> {
  const fields = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    dueDate: String(formData.get("due_date") ?? ""),
    assigneeId: String(formData.get("assignee_id") ?? ""),
  };
  const attempt = previous.attempt + 1;
  function failure(message: string): CreateTaskState {
    return { attempt, status: "error", message, fields };
  }

  const account = await readAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "unavailable") {
    return failure("ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
  }
  const { supabase, user } = account;

  const { data: membership, error: membershipError } = await readMembership(
    supabase,
    user.id,
  );
  if (membershipError) return failure("ตรวจสอบสิทธิ์สร้างงานไม่สำเร็จ กรุณาลองใหม่");
  if (membership?.role !== "leader") {
    return failure("เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้");
  }
  if (!fields.title) return failure("กรุณากรอกชื่องาน");
  if (!fields.assigneeId) return failure("กรุณาเลือกผู้รับงาน");
  if (!uuidPattern.test(fields.assigneeId)) {
    return failure("เลือกผู้รับงานได้เฉพาะสมาชิกในทีม");
  }

  if (fields.dueDate) {
    const date = new Date(`${fields.dueDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.dueDate) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== fields.dueDate ||
        fields.dueDate < "0001-01-01") {
      return failure("กรุณากรอกวันกำหนดส่งให้ถูกต้อง");
    }
  }

  const { error } = await supabase.from("tasks").insert({
    team_id: membership.team_id,
    assignee_id: fields.assigneeId,
    title: fields.title,
    description: fields.description || null,
    due_date: fields.dueDate || null,
  });

  if (error?.code === "23503") return failure("เลือกผู้รับงานได้เฉพาะสมาชิกในทีม");
  if (error?.code === "42501") return failure("เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้");
  if (error) return failure("สร้างงานไม่สำเร็จ กรุณาลองใหม่");

  revalidatePath("/tasks");
  return {
    attempt,
    status: "success",
    message: "สร้างงานแล้ว",
    fields: { title: "", description: "", dueDate: "", assigneeId: "" },
  };
}

export async function updateTaskStatus(
  taskId: string,
  _previous: string,
  formData: FormData,
): Promise<string> {
  const account = await readAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "unavailable") return "ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";

  const status = formData.get("status");
  if (!uuidPattern.test(taskId) || typeof status !== "string" ||
      !taskStatuses.some((option) => option.status === status)) {
    return "กรุณาเลือกสถานะงานที่ถูกต้อง";
  }

  const { data, error } = await account.supabase.from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id")
    .maybeSingle();

  if (error?.code === "42501" || (!error && !data)) return "คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้";
  if (error) return "บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่";

  revalidatePath("/tasks");
  return "";
}
