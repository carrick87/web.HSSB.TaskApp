import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueDirectEmail } from "@/lib/email/enqueue";
import { getEmailConfig } from "@/lib/email/config";
import { inviteAcceptUrl } from "@/lib/email/urls";
import { EMAIL_TEMPLATES } from "@/lib/email/templates-keys";
import { emitNotification } from "@/lib/notifications/emit";
import { formatOrgRoleLabel } from "@/lib/org/roles";

export async function enqueueWorkspaceInviteEmail(input: {
  orgId: string;
  email: string;
  token: string;
  role: string;
  inviterUserId: string;
}) {
  const admin = createAdminClient();
  const { data: inviter } = await admin.from("profiles").select("username").eq("id", input.inviterUserId).single();
  const { data: org } = await admin.from("organizations").select("name").eq("id", input.orgId).single();

  await enqueueDirectEmail({
    orgId: input.orgId,
    recipientEmail: input.email,
    template: EMAIL_TEMPLATES.WORKSPACE_INVITE,
    mandatory: true,
    idempotencyKey: `workspace_invite:${input.orgId}:${input.email}:${input.token.slice(0, 8)}`,
    payload: {
      inviterName: inviter?.username ?? "A teammate",
      acceptUrl: inviteAcceptUrl(input.token),
      roleLabel: formatOrgRoleLabel(input.role),
      orgName: org?.name,
    },
  });
}

export async function notifyInviteAccepted(input: {
  orgId: string;
  inviterUserId: string;
  inviteeUserId: string;
}) {
  const admin = createAdminClient();
  const { data: invitee } = await admin.from("profiles").select("username").eq("id", input.inviteeUserId).single();
  const { appUrl } = getEmailConfig();
  return emitNotification({
    orgId: input.orgId,
    recipientUserId: input.inviterUserId,
    actorUserId: input.inviteeUserId,
    eventType: "invite.accepted",
    emailTemplate: EMAIL_TEMPLATES.INVITE_ACCEPTED,
    emailPayload: {
      inviteeName: invitee?.username ?? "A new member",
      membersUrl: `${appUrl}/settings/members`,
    },
    payload: {
      title: "Invite accepted",
      inAppBody: `${invitee?.username ?? "Someone"} joined your workspace`,
      linkPath: "/settings/members",
    },
  });
}

export async function notifyAccountDeletedEmail(email: string) {
  await enqueueDirectEmail({
    orgId: null,
    recipientEmail: email,
    template: EMAIL_TEMPLATES.ACCOUNT_DELETED,
    mandatory: true,
    payload: {},
  });
}

export async function notifyWorkspaceStatusChange(input: {
  orgId: string;
  suspended: boolean;
  reason?: string;
}) {
  const admin = createAdminClient();
  const { appUrl } = getEmailConfig();
  const template = input.suspended ? EMAIL_TEMPLATES.WORKSPACE_SUSPENDED : EMAIL_TEMPLATES.WORKSPACE_REACTIVATED;

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id, profiles!inner(auth_email, harrison_email, email_suppressed)")
    .eq("org_id", input.orgId)
    .eq("status", "active");

  for (const m of members ?? []) {
    const profile = m.profiles as {
      auth_email?: string;
      harrison_email?: string | null;
      email_suppressed?: boolean;
    };
    if (profile.email_suppressed) continue;
    const email = profile.harrison_email ?? profile.auth_email;
    if (!email) continue;
    await enqueueDirectEmail({
      orgId: input.orgId,
      recipientEmail: email,
      template,
      mandatory: true,
      idempotencyKey: `${template}:${input.orgId}:${m.user_id}:${Date.now()}`,
      payload: input.suspended ? { reason: input.reason } : { appUrl },
    });
  }
}
