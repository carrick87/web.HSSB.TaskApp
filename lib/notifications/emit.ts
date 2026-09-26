import { createAdminClient } from "@/lib/supabase/admin";
import {
  EMAIL_TEMPLATES,
  MANDATORY_TEMPLATES,
  TASK_ACTIVITY_BATCH_DELAY_MS,
  taskActivityBatchKey,
  type EmailTemplateKey,
} from "@/lib/email/templates-keys";

export type EmitNotificationInput = {
  orgId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  eventType: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  emailTemplate?: EmailTemplateKey;
  emailPayload?: Record<string, unknown>;
  mandatoryEmail?: boolean;
  batchTaskId?: string;
  skipInApp?: boolean;
};

async function getRecipientEmail(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("auth_email, harrison_email, email_suppressed, username")
    .eq("id", userId)
    .single();
  if (!data || data.email_suppressed) return null;
  return (data.harrison_email ?? data.auth_email) as string;
}

async function shouldSendCategory(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orgId: string,
  template: EmailTemplateKey
) {
  if (MANDATORY_TEMPLATES.has(template)) return true;
  const { data: prefs } = await admin
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (prefs?.pause_all) return false;
  if (!prefs) {
    if (template === EMAIL_TEMPLATES.TASK_DIGEST) return false;
    return true;
  }
  if (template === EMAIL_TEMPLATES.TASK_ACTIVITY) return prefs.task_activity !== false;
  if (template === EMAIL_TEMPLATES.TASK_REMINDERS) return prefs.reminders !== false;
  if (template === EMAIL_TEMPLATES.TASK_DIGEST) return prefs.digest_frequency !== "off";
  if (
    template === EMAIL_TEMPLATES.ROLE_CHANGED ||
    template === EMAIL_TEMPLATES.REMOVED_FROM_WORKSPACE ||
    template === EMAIL_TEMPLATES.INVITE_ACCEPTED
  ) {
    return prefs.membership_updates !== false;
  }
  return true;
}

async function shouldSendInApp(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orgId: string,
  eventType: string
) {
  const { data: prefs } = await admin
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!prefs) return true;
  if (eventType.startsWith("invite") || eventType.includes("security") || eventType === "workspace.suspended") {
    return prefs.in_app_invites !== false;
  }
  if (eventType.startsWith("task.") || eventType === "task.activity") {
    return prefs.in_app_task_activity !== false;
  }
  if (eventType.includes("reminder") || eventType.includes("digest")) {
    return prefs.in_app_reminders !== false;
  }
  if (eventType.startsWith("member.") || eventType === "invite.accepted") {
    return prefs.in_app_membership !== false;
  }
  return true;
}

export async function emitNotification(input: EmitNotificationInput) {
  if (input.actorUserId && input.actorUserId === input.recipientUserId) {
    return { skipped: "self_action" as const };
  }

  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from("notification_events")
    .insert({
      org_id: input.orgId,
      user_id: input.recipientUserId,
      actor_id: input.actorUserId ?? null,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("[notifications] event insert failed", eventError.message);
    return { error: eventError.message };
  }

  if (!input.skipInApp) {
    const inAppOk = await shouldSendInApp(admin, input.recipientUserId, input.orgId, input.eventType);
    if (inAppOk) {
      const title =
        (input.payload?.title as string) ??
        (input.payload?.inAppTitle as string) ??
        input.eventType.replace(/_/g, " ");
      const body = (input.payload?.body as string) ?? (input.payload?.inAppBody as string) ?? null;
      const link = (input.payload?.linkPath as string) ?? null;
      await admin.from("notifications").insert({
        org_id: input.orgId,
        user_id: input.recipientUserId,
        title,
        body,
        link_path: link,
        notification_event_id: event.id,
      });
    }
  }

  if (!input.emailTemplate) return { eventId: event.id };

  const allowed = await shouldSendCategory(admin, input.recipientUserId, input.orgId, input.emailTemplate);
  if (!allowed) return { eventId: event.id, emailSkipped: "preferences" };

  const recipientEmail = await getRecipientEmail(admin, input.recipientUserId);
  if (!recipientEmail) return { eventId: event.id, emailSkipped: "no_email" };

  const mandatory = input.mandatoryEmail ?? MANDATORY_TEMPLATES.has(input.emailTemplate);
  const sendAfter = new Date();
  let batchKey: string | null = null;
  if (input.emailTemplate === EMAIL_TEMPLATES.TASK_ACTIVITY && input.batchTaskId) {
    sendAfter.setTime(sendAfter.getTime() + TASK_ACTIVITY_BATCH_DELAY_MS);
    batchKey = taskActivityBatchKey(input.orgId, input.recipientUserId, input.batchTaskId);
  }

  const idempotencyKey = `${input.emailTemplate}:${event.id}`;

  const { error: outboxError } = await admin.from("email_outbox").insert({
    org_id: input.orgId,
    recipient_email: recipientEmail,
    template: input.emailTemplate,
    payload: { ...(input.emailPayload ?? {}), recipientUserId: input.recipientUserId },
    status: "pending",
    send_after: sendAfter.toISOString(),
    idempotency_key: idempotencyKey,
    batch_key: batchKey,
    notification_event_id: event.id,
    mandatory,
  });

  if (outboxError && !outboxError.message.toLowerCase().includes("duplicate")) {
    console.error("[email] outbox enqueue failed", outboxError.message);
  }

  return { eventId: event.id };
}
