import { createAdminClient } from "@/lib/supabase/admin";
import { taskUrl } from "@/lib/email/urls";
import { enqueueTaskActivityEmail } from "@/lib/email/enqueue";
import { EMAIL_TEMPLATES } from "@/lib/email/templates-keys";
import { emitNotification } from "@/lib/notifications/emit";
import { formatOrgRoleLabel } from "@/lib/org/roles";

async function actorName(admin: ReturnType<typeof createAdminClient>, actorId: string) {
  const { data } = await admin.from("profiles").select("username").eq("id", actorId).single();
  return data?.username ?? "Someone";
}

export async function notifyTaskAssigned(input: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  actorId: string;
  previousAssigneeId?: string | null;
}) {
  const admin = createAdminClient();
  const actor = await actorName(admin, input.actorId);
  const url = taskUrl(input.taskId);

  if (input.previousAssigneeId && input.previousAssigneeId !== input.actorId) {
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: input.previousAssigneeId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line: `${actor} unassigned you from this task`,
    });
  }

  if (input.assigneeId !== input.previousAssigneeId) {
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: input.assigneeId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line: `${actor} assigned you to this task`,
    });
  }
}

export async function notifyTaskStatusChange(input: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
  assigneeId: string;
  createdBy: string;
  status: string;
  previousStatus: string;
}) {
  if (input.status === input.previousStatus) return;
  const admin = createAdminClient();
  const actor = await actorName(admin, input.actorId);
  const url = taskUrl(input.taskId);
  const line = `${actor} changed status to ${input.status.replace(/_/g, " ")}`;

  const recipients = new Set<string>([input.assigneeId, input.createdBy]);
  const { data: watchers } = await admin
    .from("task_watchers")
    .select("user_id")
    .eq("task_id", input.taskId);
  for (const w of watchers ?? []) recipients.add(w.user_id);

  for (const userId of recipients) {
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: userId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line,
    });
  }
}

export async function notifyTaskDueDateChange(input: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
  assigneeId: string;
  createdBy: string;
  dueLabel: string;
}) {
  const admin = createAdminClient();
  const actor = await actorName(admin, input.actorId);
  const url = taskUrl(input.taskId);
  const line = `${actor} set due date to ${input.dueLabel}`;

  const recipients = new Set<string>([input.assigneeId, input.createdBy]);
  const { data: watchers } = await admin
    .from("task_watchers")
    .select("user_id")
    .eq("task_id", input.taskId);
  for (const w of watchers ?? []) recipients.add(w.user_id);

  for (const userId of recipients) {
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: userId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line,
    });
  }
}

export async function notifyTaskComment(input: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
  assigneeId: string;
  createdBy: string;
  content: string;
}) {
  const admin = createAdminClient();
  const actor = await actorName(admin, input.actorId);
  const url = taskUrl(input.taskId);
  const snippet = input.content.length > 120 ? `${input.content.slice(0, 117)}…` : input.content;

  const mentionIds = new Set<string>();
  const { data: members } = await admin
    .from("organization_members")
    .select("user_id, profiles!inner(username)")
    .eq("org_id", input.orgId)
    .eq("status", "active");
  for (const m of members ?? []) {
    const username = (m.profiles as { username?: string })?.username;
    if (username && input.content.includes(`@${username}`)) {
      mentionIds.add(m.user_id);
    }
  }

  for (const userId of mentionIds) {
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: userId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line: `${actor} mentioned you: “${snippet}”`,
    });
  }

  const recipients = new Set<string>([input.assigneeId, input.createdBy]);
  const { data: watchers } = await admin
    .from("task_watchers")
    .select("user_id")
    .eq("task_id", input.taskId);
  for (const w of watchers ?? []) recipients.add(w.user_id);

  for (const userId of recipients) {
    if (mentionIds.has(userId)) continue;
    await enqueueTaskActivityEmail({
      orgId: input.orgId,
      recipientUserId: userId,
      actorUserId: input.actorId,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskUrl: url,
      line: `${actor} commented: “${snippet}”`,
    });
  }
}

export async function notifyWelcomeWorkspace(input: {
  orgId: string;
  ownerUserId: string;
  ownerName: string;
}) {
  const { appUrl } = await import("@/lib/email/config").then((m) => m.getEmailConfig());
  return emitNotification({
    orgId: input.orgId,
    recipientUserId: input.ownerUserId,
    eventType: "workspace.created",
    emailTemplate: EMAIL_TEMPLATES.WELCOME_WORKSPACE,
    mandatoryEmail: true,
    skipInApp: true,
    emailPayload: {
      ownerName: input.ownerName,
      dashboardUrl: `${appUrl}/dashboard`,
    },
  });
}

export async function notifyRoleChanged(input: {
  orgId: string;
  targetUserId: string;
  actorId: string;
  newRole: string;
}) {
  const { appUrl } = await import("@/lib/email/config").then((m) => m.getEmailConfig());
  return emitNotification({
    orgId: input.orgId,
    recipientUserId: input.targetUserId,
    actorUserId: input.actorId,
    eventType: "member.role_changed",
    emailTemplate: EMAIL_TEMPLATES.ROLE_CHANGED,
    emailPayload: {
      newRole: formatOrgRoleLabel(input.newRole),
      settingsUrl: `${appUrl}/settings/organization`,
    },
    payload: {
      title: "Your role changed",
      inAppBody: `You are now ${formatOrgRoleLabel(input.newRole)}`,
      linkPath: "/settings/organization",
    },
  });
}

export async function notifyRemovedFromWorkspace(input: {
  orgId: string;
  targetUserId: string;
  actorId: string;
}) {
  const { appUrl } = await import("@/lib/email/config").then((m) => m.getEmailConfig());
  return emitNotification({
    orgId: input.orgId,
    recipientUserId: input.targetUserId,
    actorUserId: input.actorId,
    eventType: "member.removed",
    emailTemplate: EMAIL_TEMPLATES.REMOVED_FROM_WORKSPACE,
    emailPayload: { supportUrl: `${appUrl}/settings/account` },
    payload: {
      title: "Removed from workspace",
      inAppBody: "You no longer have access to this workspace.",
    },
  });
}
