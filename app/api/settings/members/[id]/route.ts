import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES, isOrgAdminRole } from "@/lib/org/roles";
import { writeOrgAuditLog } from "@/lib/org/audit";

const VALID_ROLES = [ORG_ROLES.OWNER, ORG_ROLES.ADMIN, ORG_ROLES.MANAGER, ORG_ROLES.MEMBER];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.orgId === "legacy") {
    return NextResponse.json({ error: "Organization migration required." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { username, harrison_email, role, branch_id, department_id } = body;

  if (!username?.trim() || username.trim().length < 3) {
    return NextResponse.json({ error: "Username required (min 3 chars)" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (role === ORG_ROLES.OWNER) {
    return NextResponse.json({ error: "Use ownership transfer to assign owner." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: beforeMember } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", ctx.orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!beforeMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetUserId === ctx.userId && role !== beforeMember.role) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  if (
    beforeMember.role === ORG_ROLES.OWNER &&
    role !== ORG_ROLES.OWNER &&
    beforeMember.status === "active"
  ) {
    const { count } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("role", ORG_ROLES.OWNER)
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last active owner. Promote another owner first." },
        { status: 400 }
      );
    }
  }

  if (!isOrgAdminRole(ctx.role) && isOrgAdminRole(beforeMember.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      username: username.trim(),
      harrison_email: typeof harrison_email === "string" ? harrison_email.trim() || null : undefined,
      branch_id: branch_id || null,
      department_id: department_id || null,
    })
    .eq("id", targetUserId);

  const { data: afterMember, error } = await supabase
    .from("organization_members")
    .update({
      role,
      branch_id: branch_id || null,
      department_id: department_id || null,
    })
    .eq("org_id", ctx.orgId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    targetId: targetUserId,
    action: "member.update",
    before: beforeMember as Record<string, unknown>,
    after: afterMember as Record<string, unknown>,
  });

  if (role !== beforeMember.role) {
    const { notifyRoleChanged } = await import("@/lib/notifications/task-events");
    await notifyRoleChanged({
      orgId: ctx.orgId,
      targetUserId,
      actorId: ctx.userId,
      newRole: role,
    });
  }

  return NextResponse.json({ ok: true, member: afterMember });
}
