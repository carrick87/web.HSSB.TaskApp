import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES, isOrgAdminRole } from "@/lib/org/roles";

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

  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  if (![ORG_ROLES.ADMIN, ORG_ROLES.MANAGER, ORG_ROLES.MEMBER].includes(role)) {
    if (role === ORG_ROLES.OWNER) {
      return NextResponse.json({ error: "Use ownership transfer to add owners" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const method = create_method === "temp_password" ? "temp_password" : "invite";
  const admin = createAdminClient();

  // Simplified: temp password path (invite similar to prior admin route)
  if (method === "invite" && !email?.trim()) {
    return NextResponse.json({ error: "Email required for invite" }, { status: 400 });
  }
  if (method === "temp_password" && (!password || password.length < 6)) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const auth_email =
    method === "invite" ? email.trim().toLowerCase() : `${crypto.randomUUID()}@taskapp.local`;

  let userId: string;
  if (method === "invite") {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(auth_email, {
      data: { username: username.trim() },
    });
    if (inviteError || !invited.user) {
      return NextResponse.json({ error: inviteError?.message ?? "Invite failed" }, { status: 400 });
    }
    userId = invited.user.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: auth_email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "Create failed" }, { status: 400 });
    }
    userId = created.user.id;
  }

  await admin.from("profiles").upsert({
    id: userId,
    username: username.trim(),
    auth_email,
    harrison_email: email?.trim() || null,
    role: "user",
    current_org_id: ctx.orgId,
    must_change_password: method === "temp_password",
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

  const { writeOrgAuditLog } = await import("@/lib/org/audit");
  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    targetId: userId,
    action: method === "invite" ? "member.invite" : "member.create_temp_password",
  });

  return NextResponse.json({ id: userId });
}
