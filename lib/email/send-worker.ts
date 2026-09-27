import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailConfig, isEmailSendingEnabled } from "./config";
import { renderEmailTemplate } from "./render-template";
import { buildUnsubscribeUrl } from "./unsubscribe";
import { EMAIL_TEMPLATES } from "./templates-keys";
import {
  buildWorkspaceFromHeader,
  mailDomainFromFrom,
  outboundMessageId,
  taskThreadRootMessageId,
} from "./format";
import { parseOrganizationReplyTo } from "./reply-to";
import { lookupRecipientSuppression } from "./suppression";
import { applySuppressionLookupToOutbox } from "./outbox-suppression";
import { emailOutboxBackoffMs, MAX_EMAIL_OUTBOX_ATTEMPTS } from "./retry";

const MAX_ATTEMPTS = MAX_EMAIL_OUTBOX_ATTEMPTS;

async function loadOrgBranding(admin: ReturnType<typeof createAdminClient>, orgId: string | null) {
  if (!orgId) {
    return {
      orgId: "unknown",
      orgName: "Workspace",
      logoWidePath: null,
      postalAddress: null as string | null,
      contactEmail: null as string | null,
    };
  }
  const { data } = await admin
    .from("organizations")
    .select("id, name, logo_wide_path, address, email")
    .eq("id", orgId)
    .single();
  const contactEmail = parseOrganizationReplyTo(data?.email) ?? null;
  return {
    orgId: data?.id ?? orgId,
    orgName: data?.name ?? "Workspace",
    logoWidePath: data?.logo_wide_path ?? null,
    postalAddress: data?.address ?? null,
    contactEmail,
  };
}

async function loadRecipientLocale(admin: ReturnType<typeof createAdminClient>, userId: string | undefined) {
  if (!userId) return { timezone: "Asia/Kuching", dateFormat: "DD/MM/YYYY" };
  const { data } = await admin.from("profiles").select("timezone, date_format").eq("id", userId).maybeSingle();
  return {
    timezone: data?.timezone ?? "Asia/Kuching",
    dateFormat: data?.date_format ?? "DD/MM/YYYY",
  };
}

async function mergeBatchRows(
  admin: ReturnType<typeof createAdminClient>,
  rows: {
    id: string;
    batch_key: string | null;
    payload: Record<string, unknown>;
    template: string;
    org_id: string | null;
    recipient_email: string;
    mandatory: boolean;
    idempotency_key?: string | null;
    attempts?: number;
  }[]
) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.batch_key ?? row.id;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const toSend: typeof rows = [];
  for (const [, group] of groups) {
    if (group.length === 1 || !group[0].batch_key) {
      toSend.push(group[0]);
      continue;
    }
    const merged = { ...group[0] };
    const lines: string[] = [];
    for (const g of group) {
      const glines = (g.payload.lines as string[]) ?? [];
      lines.push(...glines);
      if (g.payload.line) lines.push(String(g.payload.line));
    }
    merged.payload = { ...merged.payload, lines: [...new Set(lines)] };
    toSend.push(merged);
    const cancelIds = group.slice(1).map((g) => g.id);
    if (cancelIds.length) {
      await admin.from("email_outbox").update({ status: "cancelled" }).in("id", cancelIds);
    }
  }
  return toSend;
}

function taskThreadHeaders(taskId: string | undefined, outboxId: string, fromEnv: string) {
  if (!taskId) return {};
  const domain = mailDomainFromFrom(fromEnv);
  const root = taskThreadRootMessageId(taskId, domain);
  const messageId = outboundMessageId(outboxId, domain);
  return {
    "Message-ID": messageId,
    "In-Reply-To": root,
    References: root,
  };
}

export async function processEmailOutbox(limit = 40) {
  const admin = createAdminClient();
  const config = getEmailConfig();
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("send_after", now)
    .lt("attempts", MAX_ATTEMPTS)
    .order("send_after", { ascending: true })
    .limit(limit);

  if (!pending?.length) return { processed: 0, sent: 0 };

  const merged = await mergeBatchRows(admin, pending as never[]);
  let sent = 0;
  const resend = isEmailSendingEnabled() ? new Resend(config.apiKey) : null;

  for (const row of merged) {
    await admin.from("email_outbox").update({ status: "processing" }).eq("id", row.id);

    const suppressionStatus = await lookupRecipientSuppression(admin, row.recipient_email);
    const maySend = await applySuppressionLookupToOutbox(admin, row, suppressionStatus);
    if (!maySend) continue;

    const recipientUserId = row.payload.recipientUserId as string | undefined;
    const unsubscribeUrl =
      recipientUserId && row.org_id && !row.mandatory
        ? buildUnsubscribeUrl(recipientUserId, row.org_id, row.template)
        : undefined;

    const branding = await loadOrgBranding(admin, row.org_id);
    const locale = await loadRecipientLocale(admin, recipientUserId);
    const rendered = await renderEmailTemplate({
      template: row.template,
      payload: row.payload as Record<string, unknown>,
      branding,
      appUrl: config.appUrl,
      emailFrom: config.from,
      unsubscribeUrl,
      timezone: locale.timezone,
      dateFormat: locale.dateFormat,
    });

    const headers: Record<string, string> = {};
    if (unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const taskId = row.payload.taskId as string | undefined;
    if (row.template === EMAIL_TEMPLATES.TASK_ACTIVITY && taskId) {
      Object.assign(headers, taskThreadHeaders(taskId, row.id, config.from));
      const domain = mailDomainFromFrom(config.from);
      await admin.from("email_task_threads").upsert({
        task_id: taskId,
        recipient_email: row.recipient_email.toLowerCase(),
        root_message_id: taskThreadRootMessageId(taskId, domain),
      });
    }

    const from = row.org_id ? buildWorkspaceFromHeader(branding.orgName, config.from) : config.from;

    if (!resend) {
      console.log("[email:dev]", {
        from,
        to: row.recipient_email,
        subject: rendered.subject,
        preheader: rendered.preheader,
        template: row.template,
        headers,
        text: rendered.text.slice(0, 200),
      });
      await admin
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), resend_id: "dev-log" })
        .eq("id", row.id);
      sent++;
      continue;
    }

    const sendPayload: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
      headers: Record<string, string>;
      replyTo?: string;
    } = {
      from,
      to: row.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers,
    };
    if (branding.contactEmail) {
      sendPayload.replyTo = branding.contactEmail;
    }

    const { data, error } = await resend.emails.send(sendPayload, {
      idempotencyKey: row.idempotency_key ?? row.id,
    });

    if (error) {
      const attempts = (row.attempts ?? 0) + 1;
      const retryAt = new Date(Date.now() + emailOutboxBackoffMs(attempts)).toISOString();
      await admin
        .from("email_outbox")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          error: error.message,
          send_after: retryAt,
        })
        .eq("id", row.id);
      continue;
    }

    await admin
      .from("email_outbox")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_id: data?.id ?? null,
      })
      .eq("id", row.id);
    sent++;
  }

  return { processed: merged.length, sent };
}
