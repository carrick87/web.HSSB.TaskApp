import { createAdminClient } from "@/lib/supabase/admin";
import { MANDATORY_TEMPLATES, TASK_ACTIVITY_BATCH_DELAY_MS, taskActivityBatchKey } from "./templates-keys";

export async function enqueueDirectEmail(input: {
  orgId: string | null;
  recipientEmail: string;
  template: string;
  payload: Record<string, unknown>;
  mandatory?: boolean;
  sendAfter?: Date;
  idempotencyKey?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("email_outbox").insert({
    org_id: input.orgId,
    recipient_email: input.recipientEmail.toLowerCase(),
    template: input.template,
    payload: input.payload,
    status: "pending",
    send_after: (input.sendAfter ?? new Date()).toISOString(),
    mandatory: input.mandatory ?? MANDATORY_TEMPLATES.has(input.template),
    idempotency_key: input.idempotencyKey ?? `${input.template}:${input.recipientEmail}:${Date.now()}`,
  });
  if (error) console.error("[email] direct enqueue", error.message);
}

export async function enqueueTaskActivityEmail(input: {
  orgId: string;
  recipientUserId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  taskUrl: string;
  line: string;
}) {
  const { emitNotification } = await import("@/lib/notifications/emit");
  const { loadTaskEmailMeta } = await import("@/lib/email/task-meta");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone, date_format")
    .eq("id", input.recipientUserId)
    .maybeSingle();
  const meta = await loadTaskEmailMeta(
    input.taskId,
    profile?.timezone ?? "Asia/Kuching",
    profile?.date_format ?? "DD/MM/YYYY"
  );

  return emitNotification({
    orgId: input.orgId,
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    eventType: "task.activity",
    entityType: "task",
    entityId: input.taskId,
    payload: {
      title: input.taskTitle,
      inAppBody: input.line,
      linkPath: input.taskUrl.replace(/^https?:\/\/[^/]+/, ""),
    },
    emailTemplate: "task_activity" as never,
    emailPayload: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: input.taskUrl,
      taskStatus: meta?.status,
      taskDueDateIso: meta?.dueDateIso,
      taskAssigneeName: meta?.assigneeName,
      lines: [input.line],
      line: input.line,
    },
    batchTaskId: input.taskId,
  });
}
