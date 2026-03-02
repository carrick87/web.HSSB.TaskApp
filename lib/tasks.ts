import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayAppDate } from "@/lib/date";

/**
 * Ensure today's task instances exist for all recurring templates that should run today.
 * Call this when loading the dashboard so "Tasks for today" shows recurring tasks even
 * if cron hasn't run (e.g. different timezone or cron not configured).
 * Uses app timezone so "today" matches the region (e.g. Asia/Kuala_Lumpur).
 * Uses admin client for INSERT so it works when staff load the dashboard (RLS allows only admin/pic to insert).
 */
export async function ensureTasksForToday(): Promise<void> {
  const today = getTodayAppDate();
  const supabase = createAdminClient();
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, assign_to_type, assign_to_id, is_active, start_date, end_date, recurrence_type, recurrence_value")
    .eq("is_active", true)
    .not("assign_to_id", "is", null);

  if (!templates?.length) return;

  const start = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  const end = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

  for (const t of templates) {
    const s = start(t.start_date);
    const e = end(t.end_date);
    if (s && s > today) continue;
    if (e && e < today) continue;

    const recurrenceType = t.recurrence_type ?? "daily";
    const recurrenceValue = t.recurrence_value ?? 0;
    if (recurrenceType === "daily") {
      // run every day
    } else if (recurrenceType === "monthly") {
      if (new Date(today).getUTCDate() !== 1) continue;
    } else if (recurrenceType === "custom" && recurrenceValue > 0 && t.start_date) {
      const startStr = new Date(t.start_date).toISOString().slice(0, 10);
      const daysSince = Math.floor((new Date(today).getTime() - new Date(startStr).getTime()) / (24 * 60 * 60 * 1000));
      if (daysSince < 0 || daysSince % recurrenceValue !== 0) continue;
    } else {
      continue;
    }

    await generateTasksForToday(
      t.id,
      t.assign_to_type ?? "user",
      t.assign_to_id,
      t.is_active,
      t.start_date,
      t.end_date
    );
  }
}

/**
 * Generate task instances for today for a template's assignees, so assignees see the task
 * immediately instead of waiting for the nightly cron.
 * Uses app timezone for "today" (see getTodayAppDate).
 */
export async function generateTasksForToday(
  templateId: string,
  assignToType: string,
  assignToId: string | null,
  isActive: boolean,
  startDate: string | null,
  endDate: string | null
): Promise<void> {
  const today = getTodayAppDate();
  const dueDate = `${today}T23:59:59.999Z`;

  if (!isActive || !assignToId) return;
  const start = startDate ? new Date(startDate).toISOString().slice(0, 10) : null;
  const end = endDate ? new Date(endDate).toISOString().slice(0, 10) : null;
  if (start && start > today) return;
  if (end && end < today) return;

  const supabase = createAdminClient();
  let assigneeIds: string[] = [];

  if (assignToType === "user") {
    assigneeIds = [assignToId];
  } else if (assignToType === "branch") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("branch_id", assignToId)
      .eq("role", "staff");
    assigneeIds = (data ?? []).map((p) => p.id);
  } else if (assignToType === "department") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("department_id", assignToId)
      .eq("role", "staff");
    assigneeIds = (data ?? []).map((p) => p.id);
  }

  for (const assigneeProfileId of assigneeIds) {
    const { error } = await supabase.from("task_instances").insert({
      template_id: templateId,
      assignee_profile_id: assigneeProfileId,
      assignment_date: today,
      due_date: dueDate,
      status: "pending",
    });
    if (error && error.code !== "23505") {
      throw error;
    }
  }
}
