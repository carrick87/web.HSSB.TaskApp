import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";
import { isPlatformAdmin } from "@/lib/platform-admin";
import {
  evaluateOrgAdminPasswordReset,
  loadTargetMembershipsForReset,
} from "@/lib/admin/password-reset-policy";

const FORGOT_PASSWORD_MESSAGE =
  "This user belongs to more than one workspace or has admin access elsewhere. They must use the self-service “Forgot password” email to reset their password.";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  const orgCtx = await getOrgApiContext(true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();
  const platformAdmin = await isPlatformAdmin(supabase);

  const { data: targetMembership } = await supabase
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgCtx.orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMembership || targetMembership.status !== "active") {
    return NextResponse.json({ error: "User not found in this workspace" }, { status: 404 });
  }

  const targetRole = targetMembership.role as string;

  const admin = createAdminClient();
  const { data: targetIsPlatformAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const targetMemberships = await loadTargetMembershipsForReset(admin, targetUserId);
  const decision = evaluateOrgAdminPasswordReset({
    callerOrgId: orgCtx.orgId,
    callerIsPlatformAdmin: platformAdmin,
    targetIsPlatformAdmin: !!targetIsPlatformAdmin,
    targetRoleInCallerOrg: targetRole,
    targetMemberships,
  });

  if (!decision.allowed) {
    if (decision.reason === "forgot_password") {
      return NextResponse.json({ error: FORGOT_PASSWORD_MESSAGE }, { status: 403 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    orgCtx.role !== ORG_ROLES.OWNER &&
    orgCtx.role !== ORG_ROLES.ADMIN
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password is required (at least 6 characters)." },
      { status: 400 }
    );
  }

  const { error } = await admin.auth.admin.updateUserById(targetUserId, { password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "Password updated." });
}
