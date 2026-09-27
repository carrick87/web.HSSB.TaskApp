import * as React from "react";
import { render } from "@react-email/render";
import { emailProductDisplayName } from "@/lib/email/format";
import {
  EmailShell,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  DigestStatsRow,
  DigestTaskRow as DigestTaskRowBlock,
  QuoteBlock,
  TaskDetailsTable,
  defaultFooter,
  orgPostalLine,
  type OrgEmailBranding,
} from "@/lib/email/components";
import {
  buildDigestPreheader,
  type DigestTaskRow,
} from "@/lib/email/digest";
import { formatDateInTimezone, localeForDateFormat } from "@/lib/email/format";

export type { OrgEmailBranding };

export type RenderedEmail = { subject: string; html: string; text: string; preheader?: string };

export type TemplateRenderContext = {
  timezone: string;
  dateFormat: string;
  appUrl: string;
  unsubscribeUrl?: string;
  productName: string;
};

function ctxFooter(
  branding: OrgEmailBranding,
  ctx: TemplateRenderContext,
  reason: string,
  opts?: { unsubscribe?: boolean; unsubscribeLabel?: string }
) {
  return defaultFooter({
    appUrl: ctx.appUrl,
    orgId: branding.orgId,
    reason,
    unsubscribeUrl: opts?.unsubscribe === false ? undefined : ctx.unsubscribeUrl,
    unsubscribeLabel: opts?.unsubscribeLabel,
    postalLine: orgPostalLine(branding),
  });
}

function formatSummaryDateLine(dateStr: string, timeZone: string, dateFormat: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const locale = localeForDateFormat(dateFormat);
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long" }).format(d);
  const datePart = formatDateInTimezone(dateStr, timeZone, dateFormat);
  return `${weekday}, ${datePart}`;
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
    <EmailParagraph key={line}>
      • {line}
    </EmailParagraph>
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
      <EmailHeading>Join {props.branding.orgName}</EmailHeading>
      <EmailParagraph>
        {props.inviterName} invited you as {props.roleLabel}. Accept to start collaborating on tasks and projects.
      </EmailParagraph>
      <EmailButton href={props.acceptUrl} label="Accept invitation" />
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
      <EmailHeading>Your workspace is ready</EmailHeading>
      <EmailParagraph>
        Hi {props.ownerName}, {props.branding.orgName} is set up on {props.ctx.productName}.
      </EmailParagraph>
      <EmailButton href={props.dashboardUrl} label="Open workspace" />
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
      <EmailHeading>Invitation accepted</EmailHeading>
      <EmailParagraph>{props.inviteeName} accepted your invite and is now a member.</EmailParagraph>
      <EmailButton href={props.membersUrl} label="View members" />
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
      <EmailHeading>Role updated</EmailHeading>
      <EmailParagraph>Your role is now {props.newRole}.</EmailParagraph>
      <EmailButton href={props.settingsUrl} label="Open workspace" />
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
      <EmailHeading>Access removed</EmailHeading>
      <EmailParagraph>Contact an admin if you think this is a mistake.</EmailParagraph>
      <EmailButton href={props.supportUrl} label="Contact support" />
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
      <EmailButton href={props.taskUrl} label="Open task" />
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
      footer={ctxFooter(props.branding, props.ctx, "You're receiving this because you have assigned tasks due.")}
    >
      <EmailHeading>{subject}</EmailHeading>
      {props.tasks.map((t) => (
        <EmailParagraph key={t.url}>
          {t.title} — {t.dueLabel}
        </EmailParagraph>
      ))}
      <EmailButton href={props.tasks[0]?.url ?? props.ctx.appUrl} label="View tasks" />
    </EmailShell>
  );
  return { subject, html, text: `${subject}\n\n${preheader}`, preheader };
}

export async function renderDigest(props: {
  branding: OrgEmailBranding;
  ctx: TemplateRenderContext;
  frequency: string;
  openCount: number;
  dueTodayCount: number;
  overdueCount: number;
  summaryDate: string;
  tasks: DigestTaskRow[];
  dashboardUrl: string;
}): Promise<RenderedEmail> {
  const freqLower = props.frequency.toLowerCase();
  const subject = `${props.frequency} digest: ${props.openCount} open, ${props.overdueCount} overdue`;
  const summaryDateLabel = formatSummaryDateLine(props.summaryDate, props.ctx.timezone, props.ctx.dateFormat);
  const preheader = buildDigestPreheader({
    dueTodayCount: props.dueTodayCount,
    overdueCount: props.overdueCount,
    summaryDateLabel,
  });
  const digestReason = `You're getting this because ${freqLower} summaries are on for your account in ${props.branding.orgName}.`;
  const html = await render(
    <EmailShell
      branding={props.branding}
      preview={preheader}
      preheader={preheader}
      productName={props.ctx.productName}
      footer={ctxFooter(props.branding, props.ctx, digestReason, {
        unsubscribeLabel: "Unsubscribe from summaries",
      })}
    >
      <EmailHeading>{`Your ${freqLower} summary`}</EmailHeading>
      <EmailParagraph muted>{summaryDateLabel}</EmailParagraph>
      <DigestStatsRow
        openCount={props.openCount}
        dueTodayCount={props.dueTodayCount}
        overdueCount={props.overdueCount}
      />
      {props.tasks.map((t, i) => (
        <DigestTaskRowBlock
          key={t.url}
          title={t.title}
          url={t.url}
          dueKind={t.dueKind}
          dueDateFormatted={t.dueDateFormatted}
          statusLabel={t.statusLabel}
          metaSuffix={t.metaSuffix}
          isLast={i === props.tasks.length - 1}
        />
      ))}
      <EmailButton href={props.dashboardUrl} label="Open my tasks" />
    </EmailShell>
  );
  return { subject, html, text: `${subject}\n\n${preheader}\n\n${props.dashboardUrl}`, preheader };
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
        postalAddress: null,
      }}
      preview={preheader}
      productName={props.ctx.productName}
      footer={defaultFooter({
        appUrl: props.ctx.appUrl,
        orgId: "account",
        reason: "You're receiving this because you deleted your account.",
        postalLine: null,
      })}
    >
      <EmailHeading>Account deleted</EmailHeading>
      <EmailParagraph>
        Your {props.ctx.productName} account and personal data have been removed as requested.
      </EmailParagraph>
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
      <EmailHeading>Workspace suspended</EmailHeading>
      <EmailParagraph>{preheader}</EmailParagraph>
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
      <EmailHeading>Workspace reactivated</EmailHeading>
      <EmailParagraph>You can sign in and continue working.</EmailParagraph>
      <EmailButton href={props.dashboardUrl} label="Open workspace" />
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
        dueTodayCount: Number(p.dueTodayCount ?? 0),
        overdueCount: Number(p.overdueCount ?? 0),
        summaryDate: String(p.summaryDate ?? new Date().toISOString().slice(0, 10)),
        tasks: (p.tasks as DigestTaskRow[]) ?? [],
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
