export const taskStatuses = [
  { status: "todo", name: "ยังไม่เริ่ม" },
  { status: "in_progress", name: "กำลังทำ" },
  { status: "done", name: "เสร็จแล้ว" },
] as const;

const bangkokDateParts = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bangkokDay(date: Date) {
  const parts = Object.fromEntries(
    bangkokDateParts.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
