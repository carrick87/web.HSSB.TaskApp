import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";
import { writeOrgAuditLog } from "@/lib/org/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.orgId === "legacy") {
    return NextResponse.json({ error: "Organization migration required." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status === "deactivated" ? "deactivated" : body.status === "active" ? "active" : null;
  if (!status) {
    return NextResponse.json({ error: "status must be active or deactivated" }, { status: 400 });
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

  if (
    status === "deactivated" &&
    beforeMember.role === ORG_ROLES.OWNER &&
    beforeMember.status === "active"
  ) {
    const { count } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("role", ORG_ROLES.OWNER)
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot deactivate the last active owner." }, { status: 400 });
    }
  }

  const { data: afterMember, error } = await supabase
    .from("organization_members")
    .update({ status })
    .eq("org_id", ctx.orgId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  if (status === "deactivated") {
    await admin.from("profiles").update({ status: "deactivated" }).eq("id", targetUserId);
  } else {
    await admin.from("profiles").update({ status: "active" }).eq("id", targetUserId);
  }

  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    targetId: targetUserId,
    action: status === "deactivated" ? "member.deactivate" : "member.reactivate",
    before: beforeMember as Record<string, unknown>,
    after: afterMember as Record<string, unknown>,
  });

  if (status === "deactivated") {
    const { notifyRemovedFromWorkspace } = await import("@/lib/notifications/task-events");
    await notifyRemovedFromWorkspace({
      orgId: ctx.orgId,
      targetUserId,
      actorId: ctx.userId,
    });
  }

  return NextResponse.json({ ok: true, member: afterMember });
}
