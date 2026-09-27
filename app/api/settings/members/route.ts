import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES, isOrgAdminRole } from "@/lib/org/roles";
import { writeOrgAuditLog } from "@/lib/org/audit";
import { normalizeEmailAddress } from "@/lib/email/address";

export async function GET() {
  const ctx = await getOrgApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("organization_members")
    .select("user_id, role, status, branch_id, department_id")
    .eq("org_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (rows ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, harrison_email, auth_email, last_sign_in_at")
        .in("id", userIds)
    : { data: [] as { id: string; username: string; harrison_email: string | null; auth_email: string; last_sign_in_at: string | null }[] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const members = (rows ?? []).map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      ...m,
      username: p?.username ?? "—",
      harrison_email: p?.harrison_email ?? null,
      auth_email: p?.auth_email ?? "",
      last_sign_in_at: p?.last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({ members, org_id: ctx.orgId });
}

export async function POST(request: Request) {
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const { username, email, password, role, branch_id, department_id, create_method } = body;
  const method = create_method === "temp_password" ? "temp_password" : "invite";

  if (method === "temp_password" && (!username?.trim() || username.trim().length < 3)) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  if (![ORG_ROLES.ADMIN, ORG_ROLES.MANAGER, ORG_ROLES.MEMBER].includes(role)) {
    if (role === ORG_ROLES.OWNER) {
      return NextResponse.json({ error: "Use ownership transfer to add owners" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (method === "invite" && !email?.trim()) {
    return NextResponse.json({ error: "Email required for invite" }, { status: 400 });
  }
  if (method === "temp_password" && (!password || password.length < 6)) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }
  const harrisonEmail =
    method === "temp_password" && email?.trim() ? normalizeEmailAddress(String(email)) : null;
  if (method === "temp_password" && email?.trim() && !harrisonEmail) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (method === "invite") {
    const emailNorm = normalizeEmailAddress(String(email));
    if (!emailNorm) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    const { data: invite, error: inviteError } = await admin
      .from("organization_invites")
      .insert({
        org_id: ctx.orgId,
        email: emailNorm,
        role,
        status: "pending",
        invited_by: ctx.userId,
      })
      .select("id, token")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: inviteError?.message ?? "Invite failed" }, { status: 400 });
    }

    const { enqueueWorkspaceInviteEmail } = await import("@/lib/email/membership-events");
    await enqueueWorkspaceInviteEmail({
      orgId: ctx.orgId,
      email: emailNorm,
      token: invite.token,
      role,
      inviterUserId: ctx.userId,
    });

    await writeOrgAuditLog({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      targetId: undefined,
      action: "member.invite_email",
    });

    return NextResponse.json({ ok: true, inviteId: invite.id });
  }

  const auth_email = `${crypto.randomUUID()}@taskapp.local`;

  let userId: string;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: auth_email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Create failed" }, { status: 400 });
  }
  userId = created.user.id;

  await admin.from("profiles").upsert({
    id: userId,
    username: username.trim(),
    auth_email,
    harrison_email: email?.trim() || null,
    role: "user",
    current_org_id: ctx.orgId,
    must_change_password: true,
  });

  await admin.from("organization_members").insert({
    org_id: ctx.orgId,
    user_id: userId,
    role,
    branch_id: branch_id || null,
    department_id: department_id || null,
    status: "active",
    invited_by: ctx.userId,
  });

  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    targetId: userId,
    action: "member.create_temp_password",
  });

  return NextResponse.json({ id: userId });
}
