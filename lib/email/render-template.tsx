import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { PRODUCT_NAME } from "@/src/config/product";
import { getOrgLogoPublicUrl } from "@/lib/org/logo-url";

export type OrgEmailBranding = {
  orgId: string;
  orgName: string;
  logoWidePath?: string | null;
  supabaseUrl?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

function OrgLayout({
  branding,
  preview,
  children,
  footerExtra,
}: {
  branding: OrgEmailBranding;
  preview: string;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}) {
  const supabaseUrl = branding.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoUrl = getOrgLogoPublicUrl(supabaseUrl, branding.orgId, branding.logoWidePath);
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            {logoUrl ? (
              <Img src={logoUrl} alt={branding.orgName} height={32} style={{ maxWidth: "180px" }} />
            ) : (
              <Text style={orgNameStyle}>{branding.orgName}</Text>
            )}
          </Section>
          {children}
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Sent by {PRODUCT_NAME} for {branding.orgName}. {footerExtra}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = { backgroundColor: "#f4f5f7", color: "#172b4d", fontFamily: "Helvetica,Arial,sans-serif", margin: 0 };
const containerStyle = { backgroundColor: "#ffffff", margin: "24px auto", padding: "24px", borderRadius: "8px", maxWidth: "560px" };
const headerStyle = { marginBottom: "16px" };
const orgNameStyle = { fontSize: "18px", fontWeight: 700, margin: 0 };
const hrStyle = { borderColor: "#dfe1e6", margin: "24px 0" };
const footerStyle = { fontSize: "12px", color: "#6b778c", lineHeight: "18px" };
const h1Style = { fontSize: "22px", fontWeight: 600, color: "#172b4d", margin: "0 0 12px" };
const pStyle = { fontSize: "15px", lineHeight: "22px", color: "#44546f", margin: "0 0 16px" };
const btnStyle = {
  backgroundColor: "#0052cc",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: 600,
  fontSize: "15px",
};

export async function renderWorkspaceInvite(props: {
  branding: OrgEmailBranding;
  inviterName: string;
  acceptUrl: string;
  roleLabel: string;
  unsubscribeUrl?: string;
}): Promise<RenderedEmail> {
  const subject = `${props.inviterName} invited you to ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject}>
      <Heading style={h1Style}>Join {props.branding.orgName}</Heading>
      <Text style={pStyle}>
        {props.inviterName} invited you as {props.roleLabel}. Accept to start collaborating on tasks and projects.
      </Text>
      <Button href={props.acceptUrl} style={btnStyle}>
        Accept invitation
      </Button>
    </OrgLayout>
  );
  const text = `${subject}\n\nAccept: ${props.acceptUrl}`;
  return { subject, html, text };
}

export async function renderWelcomeWorkspace(props: {
  branding: OrgEmailBranding;
  ownerName: string;
  dashboardUrl: string;
}): Promise<RenderedEmail> {
  const subject = `Welcome to ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject}>
      <Heading style={h1Style}>Your workspace is ready</Heading>
      <Text style={pStyle}>Hi {props.ownerName}, {props.branding.orgName} is set up on {PRODUCT_NAME}. Invite teammates or create your first task when you are ready.</Text>
      <Button href={props.dashboardUrl} style={btnStyle}>Open workspace</Button>
    </OrgLayout>
  );
  return { subject, html, text: `${subject}\n\n${props.dashboardUrl}` };
}

export async function renderInviteAccepted(props: {
  branding: OrgEmailBranding;
  inviteeName: string;
  membersUrl: string;
  unsubscribeUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.inviteeName} joined ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject} footerExtra={<Link href={props.unsubscribeUrl}>Unsubscribe</Link>}>
      <Heading style={h1Style}>Invitation accepted</Heading>
      <Text style={pStyle}>{props.inviteeName} accepted your invite and is now a member.</Text>
      <Button href={props.membersUrl} style={btnStyle}>View members</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderRoleChanged(props: {
  branding: OrgEmailBranding;
  newRole: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}): Promise<RenderedEmail> {
  const subject = `Your role in ${props.branding.orgName} changed`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject} footerExtra={<Link href={props.unsubscribeUrl}>Unsubscribe</Link>}>
      <Heading style={h1Style}>Role updated</Heading>
      <Text style={pStyle}>Your role is now {props.newRole}.</Text>
      <Button href={props.settingsUrl} style={btnStyle}>Open workspace</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderRemovedFromWorkspace(props: {
  branding: OrgEmailBranding;
  supportUrl: string;
}): Promise<RenderedEmail> {
  const subject = `You were removed from ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject}>
      <Heading style={h1Style}>Access removed</Heading>
      <Text style={pStyle}>You no longer have access to this workspace. Contact an admin if you think this is a mistake.</Text>
      <Button href={props.supportUrl} style={btnStyle}>Contact support</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderTaskActivity(props: {
  branding: OrgEmailBranding;
  taskTitle: string;
  taskUrl: string;
  lines: string[];
  unsubscribeUrl: string;
}): Promise<RenderedEmail> {
  const subject = `Updates on ${props.taskTitle}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject} footerExtra={<Link href={props.unsubscribeUrl}>Unsubscribe</Link>}>
      <Heading style={h1Style}>{props.taskTitle}</Heading>
      {props.lines.map((line, i) => (
        <Text key={i} style={pStyle}>• {line}</Text>
      ))}
      <Button href={props.taskUrl} style={btnStyle}>Open task</Button>
    </OrgLayout>
  );
  return { subject, html, text: `${subject}\n\n${props.lines.join("\n")}\n\n${props.taskUrl}` };
}

export async function renderTaskReminders(props: {
  branding: OrgEmailBranding;
  bucket: string;
  tasks: { title: string; url: string; dueLabel: string }[];
  unsubscribeUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.bucket} tasks in ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject} footerExtra={<Link href={props.unsubscribeUrl}>Unsubscribe</Link>}>
      <Heading style={h1Style}>{props.bucket}</Heading>
      {props.tasks.map((t, i) => (
        <Text key={i} style={pStyle}>
          <Link href={t.url}>{t.title}</Link> — {t.dueLabel}
        </Text>
      ))}
      <Button href={props.tasks[0]?.url ?? "#"} style={btnStyle}>View tasks</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderDigest(props: {
  branding: OrgEmailBranding;
  frequency: string;
  openCount: number;
  overdueCount: number;
  activityLines: string[];
  dashboardUrl: string;
  unsubscribeUrl: string;
}): Promise<RenderedEmail> {
  const subject = `${props.frequency} digest — ${props.branding.orgName}`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject} footerExtra={<Link href={props.unsubscribeUrl}>Unsubscribe</Link>}>
      <Heading style={h1Style}>Your {props.frequency} summary</Heading>
      <Text style={pStyle}>{props.openCount} open tasks · {props.overdueCount} overdue</Text>
      {props.activityLines.map((line, i) => (
        <Text key={i} style={pStyle}>• {line}</Text>
      ))}
      <Button href={props.dashboardUrl} style={btnStyle}>Open dashboard</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderAccountDeleted(props: { productName?: string }): Promise<RenderedEmail> {
  const subject = "Your account was deleted";
  const html = await render(
    <Html>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>Account deleted</Heading>
          <Text style={pStyle}>Your {PRODUCT_NAME} account and personal data have been removed as requested.</Text>
        </Container>
      </Body>
    </Html>
  );
  return { subject, html, text: subject };
}

export async function renderWorkspaceSuspended(props: { branding: OrgEmailBranding; reason?: string }): Promise<RenderedEmail> {
  const subject = `${props.branding.orgName} has been suspended`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject}>
      <Heading style={h1Style}>Workspace suspended</Heading>
      <Text style={pStyle}>{props.reason ?? "This workspace is temporarily unavailable. Contact your platform administrator."}</Text>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export async function renderWorkspaceReactivated(props: { branding: OrgEmailBranding; appUrl: string }): Promise<RenderedEmail> {
  const subject = `${props.branding.orgName} is active again`;
  const html = await render(
    <OrgLayout branding={props.branding} preview={subject}>
      <Heading style={h1Style}>Workspace reactivated</Heading>
      <Text style={pStyle}>Your workspace is available again.</Text>
      <Button href={props.appUrl} style={btnStyle}>Open workspace</Button>
    </OrgLayout>
  );
  return { subject, html, text: subject };
}

export type TemplateRenderInput = {
  template: string;
  payload: Record<string, unknown>;
  branding: OrgEmailBranding;
  appUrl: string;
  unsubscribeUrl?: string;
};

export async function renderEmailTemplate(input: TemplateRenderInput): Promise<RenderedEmail> {
  const p = input.payload;
  const branding = input.branding;
  const u = input.unsubscribeUrl ?? (p.unsubscribeUrl as string) ?? "";

  switch (input.template) {
    case "workspace_invite":
      return await renderWorkspaceInvite({
        branding,
        inviterName: String(p.inviterName ?? "A teammate"),
        acceptUrl: String(p.acceptUrl),
        roleLabel: String(p.roleLabel ?? "member"),
      });
    case "welcome_workspace":
      return await renderWelcomeWorkspace({
        branding,
        ownerName: String(p.ownerName ?? "there"),
        dashboardUrl: String(p.dashboardUrl ?? input.appUrl),
      });
    case "invite_accepted":
      return await renderInviteAccepted({
        branding,
        inviteeName: String(p.inviteeName),
        membersUrl: String(p.membersUrl),
        unsubscribeUrl: u,
      });
    case "role_changed":
      return await renderRoleChanged({
        branding,
        newRole: String(p.newRole),
        settingsUrl: String(p.settingsUrl ?? input.appUrl),
        unsubscribeUrl: u,
      });
    case "removed_from_workspace":
      return await renderRemovedFromWorkspace({
        branding,
        supportUrl: String(p.supportUrl ?? input.appUrl),
      });
    case "task_activity":
      return await renderTaskActivity({
        branding,
        taskTitle: String(p.taskTitle ?? "Task"),
        taskUrl: String(p.taskUrl),
        lines: (p.lines as string[]) ?? [],
        unsubscribeUrl: u,
      });
    case "task_reminders":
      return await renderTaskReminders({
        branding,
        bucket: String(p.bucket ?? "Due"),
        tasks: (p.tasks as { title: string; url: string; dueLabel: string }[]) ?? [],
        unsubscribeUrl: u,
      });
    case "task_digest":
      return await renderDigest({
        branding,
        frequency: String(p.frequency ?? "Daily"),
        openCount: Number(p.openCount ?? 0),
        overdueCount: Number(p.overdueCount ?? 0),
        activityLines: (p.activityLines as string[]) ?? [],
        dashboardUrl: String(p.dashboardUrl ?? input.appUrl),
        unsubscribeUrl: u,
      });
    case "account_deleted":
      return await renderAccountDeleted({});
    case "workspace_suspended":
      return await renderWorkspaceSuspended({ branding, reason: p.reason as string | undefined });
    case "workspace_reactivated":
      return await renderWorkspaceReactivated({ branding, appUrl: input.appUrl });
    default:
      return {
        subject: "Notification",
        html: `<p>${input.template}</p>`,
        text: input.template,
      };
  }
}
