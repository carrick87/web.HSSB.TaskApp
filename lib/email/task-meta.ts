import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateInTimezone } from "@/lib/email/format";

export type TaskEmailMeta = {
  taskId: string;
  title: string;
  status?: string;
  dueDateIso?: string | null;
  assigneeName?: string;
};

export async function loadTaskEmailMeta(taskId: string, recipientTimezone: string, dateFormat: string): Promise<TaskEmailMeta | null> {
  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, title, status, due_date, assignee_id, assignee:profiles!tasks_assignee_id_fkey(username)")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;
  const assignee = task.assignee as { username?: string } | null;
  return {
    taskId: task.id,
    title: task.title,
    status: String(task.status ?? "").replace(/_/g, " "),
    dueDateIso: task.due_date,
    assigneeName: assignee?.username ?? "—",
  };
}

export function formatTaskDueLabel(iso: string | null | undefined, timeZone: string, dateFormat: string) {
  if (!iso) return "Not set";
  return formatDateInTimezone(iso, timeZone, dateFormat);
}
