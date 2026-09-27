import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { PRODUCT_POSTAL_ADDRESS } from "@/src/config/product";
import { emailProductDisplayName } from "@/lib/email/format";
import {
  EmailShell,
  OpenTaskButton,
  QuoteBlock,
  TaskDetailsTable,
  defaultFooter,
  type OrgEmailBranding,
} from "@/lib/email/components";
import { formatDateInTimezone } from "@/lib/email/format";

export type { OrgEmailBranding };

export type RenderedEmail = { subject: string; html: string; text: string; preheader?: string };

export type TemplateRenderContext = {
  timezone: string;
  dateFormat: string;
  appUrl: string;
  unsubscribeUrl?: string;
  productName: string;
};

const pStyle = { fontSize: "15px", lineHeight: "22px", color: "#44546f", margin: "0 0 16px" };
const h1Style = { fontSize: "20px", fontWeight: 600, color: "#172b4d", margin: "0 0 16px" };

function postal(branding: OrgEmailBranding) {
  return branding.postalAddress?.trim() || PRODUCT_POSTAL_ADDRESS;
}

function ctxFooter(
  branding: OrgEmailBranding,
  ctx: TemplateRenderContext,
  reason: string,
  opts?: { requirePostal?: boolean; unsubscribe?: boolean }
) {
  return defaultFooter({
    appUrl: ctx.appUrl,
    orgId: branding.orgId,
    reason,
    unsubscribeUrl: opts?.unsubscribe === false ? undefined : ctx.unsubscribeUrl,
    postalAddress: postal(branding),
    requirePostal: opts?.requirePostal,
  });
}

function renderActivityLine(line: string) {
  const commentMatch = line.match(/^(.+?) commented: [“"](.+)[”"]$/);
  const mentionMatch = line.match(/^(.+?) mentioned you: [“"](.+)[”"]$/);
  if (commentMatch) {
    return (
      <QuoteBlock key={line}>
        <strong>{commentMatch[1]}</strong> commented:
        <br />
        {commentMatch[2]}
      </QuoteBlock>
    );
  }
  if (mentionMatch) {
    return (
      <QuoteBlock key={line}>
        <strong>{mentionMatch[1]}</strong> mentioned you:
        <br />
        {mentionMatch[2]}
      </QuoteBlock>
    );
  }
  return (
    <Text key={line} style={pStyle}>
      • {line}
    </Text>
  );
}

export async function renderWorkspaceInvite(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  inviterName: string;
  acceptUrl: string;
  roleLabel: string;
}): Promise<RenderedEmail> {
  const subject = `${props.inviterName} invited you to ${props.branding.orgName}`;
  const preheader = `Join as ${props.roleLabel} — accept your invitation to collaborate on tasks.`;
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      preheader={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you were invited to this workspace.", {
        unsubscribe: false,
      })}
    >
      <Heading style={h1Style}>Join {props.branding.orgName}</Heading>
      <Text style={pStyle}>
        {props.inviterName} invited you as {props.roleLabel}. Accept to start collaborating on tasks and projects.
      </Text>
      <OpenTaskButton href={props.acceptUrl} label="Accept invitation" />
    </EmailShell>
  );
  return { subject, html, text: `${subject}\n\n${preheader}\n\nAccept: ${props.acceptUrl}`, preheader };
}

export async function renderWelcomeWorkspace(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  ownerName: string;
  dashboardUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.ownerName}, your workspace ${props.branding.orgName} is ready`;
  const preheader = `Get started on ${props.ctx.productName} — invite teammates or create your first task.`;
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you created this workspace.", {
        unsubscribe: false,
      })}
    >
      <Heading style={h1Style}>Your workspace is ready</Heading>
      <Text style={pStyle}>
        Hi {props.ownerName}, {props.branding.orgName} is set up on {props.ctx.productName}.
      </Text>
      <OpenTaskButton href={props.dashboardUrl} label="Open workspace" />
    </EmailShell>
  );
  return { subject, html, text: `${subject}\n\n${props.dashboardUrl}`, preheader };
}

export async function renderInviteAccepted(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  inviteeName: string;
  membersUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.inviteeName} joined ${props.branding.orgName}`;
  const preheader = "Your invitation was accepted — review members anytime.";
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you sent a workspace invite.")}
    >
      <Heading style={h1Style}>Invitation accepted</Heading>
      <Text style={pStyle}>{props.inviteeName} accepted your invite and is now a member.</Text>
      <OpenTaskButton href={props.membersUrl} label="View members" />
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderRoleChanged(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  actorName: string;
  newRole: string;
  settingsUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.actorName} updated your role in ${props.branding.orgName}`;
  const preheader = `You are now ${props.newRole}.`;
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because your membership changed.")}
    >
      <Heading style={h1Style}>Role updated</Heading>
      <Text style={pStyle}>Your role is now {props.newRole}.</Text>
      <OpenTaskButton href={props.settingsUrl} label="Open workspace" />
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderRemovedFromWorkspace(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  actorName: string;
  supportUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.actorName} removed you from ${props.branding.orgName}`;
  const preheader = "You no longer have access to this workspace.";
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because your workspace access changed.", {
        unsubscribe: false,
      })}
    >
      <Heading style={h1Style}>Access removed</Heading>
      <Text style={pStyle}>Contact an admin if you think this is a mistake.</Text>
      <OpenTaskButton href={props.supportUrl} label="Contact support" />
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderTaskActivity(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  taskTitle: string;
  taskUrl: string;
  taskId: string;
  status?: string;
  dueDateIso?: string | null;
  assigneeName?: string;
  lines: string[];
}): Promise<RenderedEmail> {
  const subject = props.taskTitle;
  const latest = props.lines[props.lines.length - 1] ?? "New activity on your task";
  const preheader = latest;
  const due = formatDateInTimezone(props.dueDateIso, props.ctx.timezone, props.ctx.dateFormat);
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(
        props.branding,
        props.ctx,
        "You're receiving this because you're assigned to, watching, or created this task."
      )}
    >
      <TaskDetailsTable
        title={props.taskTitle}
        status={props.status}
        dueDate={due}
        assignee={props.assigneeName}
      />
      {props.lines.map((line) => renderActivityLine(line))}
      <OpenTaskButton href={props.taskUrl} />
    </EmailShell>
  );
  const text = `${subject}\n\n${props.lines.join("\n")}\n\n${props.taskUrl}`;
  return { subject, html, text, preheader };
}

export async function renderTaskReminders(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  tasks: { title: string; url: string; dueLabel: string }[];
}): Promise<RenderedEmail> {
  const count = props.tasks.length;
  const subject = `${count} task${count === 1 ? "" : "s"} due today`;
  const preheader = props.tasks.map((t) => `${t.title} (${t.dueLabel})`).join(" · ");
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you have assigned tasks due.", {
        requirePostal: false,
      })}
    >
      <Heading style={h1Style}>{subject}</Heading>
      {props.tasks.map((t) => (
        <Text key={t.url} style={pStyle}>
          {t.title} — {t.dueLabel}
        </Text>
      ))}
      <OpenTaskButton href={props.tasks[0]?.url ?? props.ctx.appUrl} label="View tasks" />
    </EmailShell>
  );
  return { subject, html, text: `${subject}\n\n${preheader}`, preheader };
}

export async function renderDigest(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  frequency: string;
  openCount: number;
  overdueCount: number;
  activityLines: string[];
  dashboardUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.frequency} digest: ${props.openCount} open, ${props.overdueCount} overdue`;
  const preheader = props.activityLines.slice(0, 3).join(" · ") || "Your task summary for this workspace.";
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you subscribed to task digests.", {
        requirePostal: true,
      })}
    >
      <Heading style={h1Style}>Your {props.frequency} summary</Heading>
      <Text style={pStyle}>
        {props.openCount} open tasks · {props.overdueCount} overdue
      </Text>
      {props.activityLines.map((line) => (
        <Text key={line} style={pStyle}>
          • {line}
        </Text>
      ))}
      <OpenTaskButton href={props.dashboardUrl} label="Open dashboard" />
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderAccountDeleted(props: {
  ctx: TemplateRenderContext;
}): Promise<RenderedEmail> {
  const subject = "Your account was deleted";
  const preheader = "This confirms your account and personal data were removed.";
  const html = await render(
    <EmailShell
      branding={{
        orgId: "account",
        orgName: props.ctx.productName,
        postalAddress: PRODUCT_POSTAL_ADDRESS,
      }}
      preview={preheader}
      productName={props.ctx.productName}
      footer={defaultFooter({
        appUrl: props.ctx.appUrl,
        orgId: "account",
        reason: "You're receiving this because you deleted your account.",
        postalAddress: PRODUCT_POSTAL_ADDRESS,
        requirePostal: true,
      })}
    >
      <Heading style={h1Style}>Account deleted</Heading>
      <Text style={pStyle}>
        Your {props.ctx.productName} account and personal data have been removed as requested.
      </Text>
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderWorkspaceSuspended(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  reason?: string;
}): Promise<RenderedEmail> {
  const subject = `${props.branding.orgName} has been suspended`;
  const preheader = props.reason ?? "This workspace is temporarily unavailable.";
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this for account security.", {
        unsubscribe: false,
      })}
    >
      <Heading style={h1Style}>Workspace suspended</Heading>
      <Text style={pStyle}>{preheader}</Text>
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export async function renderWorkspaceReactivated(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  dashboardUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.branding.orgName} is active again`;
  const preheader = "Your workspace is available again.";
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this for account security.", {
        unsubscribe: false,
      })}
    >
      <Heading style={h1Style}>Workspace reactivated</Heading>
      <Text style={pStyle}>You can sign in and continue working.</Text>
      <OpenTaskButton href={props.dashboardUrl} label="Open workspace" />
    </EmailShell>
  );
  return { subject, html, text: subject, preheader };
}

export type TemplateRenderInput = {
  template: string;
  payload: Record<string, unknown>;
  branding: OrgEmailBranding;
  appUrl: string;
  emailFrom?: string;
  unsubscribeUrl?: string;
  timezone?: string;
  dateFormat?: string;
};

export async function renderEmailTemplate(input: TemplateRenderInput): Promise<RenderedEmail> {
  const p = input.payload;
  const branding = input.branding;
  const emailFrom = input.emailFrom ?? process.env.EMAIL_FROM ?? "";
  const ctx: TemplateRenderContext = {
    appUrl: input.appUrl,
    unsubscribeUrl: input.unsubscribeUrl ?? (p.unsubscribeUrl as string | undefined),
    timezone: input.timezone ?? "Asia/Kuching",
    dateFormat: input.dateFormat ?? "DD/MM/YYYY",
    productName: emailProductDisplayName(emailFrom),
  };

  switch (input.template) {
    case "workspace_invite":
      return renderWorkspaceInvite({
        branding,
        ctx,
        inviterName: String(p.inviterName ?? "A teammate"),
        acceptUrl: String(p.acceptUrl),
        roleLabel: String(p.roleLabel ?? "member"),
      });
    case "welcome_workspace":
      return renderWelcomeWorkspace({
        branding,
        ctx,
        ownerName: String(p.ownerName ?? "there"),
        dashboardUrl: String(p.dashboardUrl ?? input.appUrl),
      });
    case "invite_accepted":
      return renderInviteAccepted({
        branding,
        ctx,
        inviteeName: String(p.inviteeName),
        membersUrl: String(p.membersUrl),
      });
    case "role_changed":
      return renderRoleChanged({
        branding,
        ctx,
        actorName: String(p.actorName ?? "An admin"),
        newRole: String(p.newRole),
        settingsUrl: String(p.settingsUrl ?? input.appUrl),
      });
    case "removed_from_workspace":
      return renderRemovedFromWorkspace({
        branding,
        ctx,
        actorName: String(p.actorName ?? "An admin"),
        supportUrl: String(p.supportUrl ?? `${input.appUrl}/settings/account`),
      });
    case "task_activity":
      return renderTaskActivity({
        branding,
        ctx,
        taskTitle: String(p.taskTitle ?? "Task"),
        taskUrl: String(p.taskUrl),
        taskId: String(p.taskId ?? p.taskTitle),
        status: p.taskStatus as string | undefined,
        dueDateIso: p.taskDueDateIso as string | null | undefined,
        assigneeName: p.taskAssigneeName as string | undefined,
        lines: (p.lines as string[]) ?? [],
      });
    case "task_reminders":
      return renderTaskReminders({
        branding,
        ctx,
        tasks: (p.tasks as { title: string; url: string; dueLabel: string }[]) ?? [],
      });
    case "task_digest":
      return renderDigest({
        branding,
        ctx,
        frequency: String(p.frequency ?? "Daily"),
        openCount: Number(p.openCount ?? 0),
        overdueCount: Number(p.overdueCount ?? 0),
        activityLines: (p.activityLines as string[]) ?? [],
        dashboardUrl: String(p.dashboardUrl ?? input.appUrl),
      });
    case "account_deleted":
      return renderAccountDeleted({ ctx });
    case "workspace_suspended":
      return renderWorkspaceSuspended({ branding, ctx, reason: p.reason as string | undefined });
    case "workspace_reactivated":
      return renderWorkspaceReactivated({
        branding,
        ctx,
        dashboardUrl: String(p.dashboardUrl ?? input.appUrl),
      });
    default:
      return {
        subject: "Notification",
        html: `<p>${input.template}</p>`,
        text: input.template,
      };
  }
}
