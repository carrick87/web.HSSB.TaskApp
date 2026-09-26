import type { SupabaseClient } from "@supabase/supabase-js";
import { ORG_ROLES } from "@/lib/org/roles";

export type ResetPasswordMembership = {
  org_id: string;
  role: string;
  status: string;
};

/** Mirrors admin reset-password route rules (also asserted in rerun_reset_password_dual_org.sql). */
export function evaluateOrgAdminPasswordReset(params: {
  callerOrgId: string;
  callerIsPlatformAdmin: boolean;
  targetIsPlatformAdmin: boolean;
  targetRoleInCallerOrg: string;
  targetMemberships: ResetPasswordMembership[];
}): { allowed: boolean; reason?: "forgot_password" | "forbidden" } {
  const {
    callerOrgId,
    callerIsPlatformAdmin,
    targetIsPlatformAdmin,
    targetRoleInCallerOrg,
    targetMemberships,
  } = params;

  if (targetIsPlatformAdmin && !callerIsPlatformAdmin) {
    return { allowed: false, reason: "forbidden" };
  }

  if (targetRoleInCallerOrg === ORG_ROLES.OWNER && !callerIsPlatformAdmin) {
    return { allowed: false, reason: "forbidden" };
  }

  if (callerIsPlatformAdmin) {
    return { allowed: true };
  }

  const active = targetMemberships.filter((m) => m.status === "active");

  const otherOrgs = active.filter((m) => m.org_id !== callerOrgId);
  if (otherOrgs.length > 0) {
    return { allowed: false, reason: "forgot_password" };
  }

  return { allowed: true };
}

export async function loadTargetMembershipsForReset(
  admin: SupabaseClient,
  targetUserId: string
): Promise<ResetPasswordMembership[]> {
  const { data } = await admin
    .from("organization_members")
    .select("org_id, role, status")
    .eq("user_id", targetUserId);
  return (data ?? []) as ResetPasswordMembership[];
}
