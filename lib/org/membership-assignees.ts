import type { SupabaseClient } from "@supabase/supabase-js";

import { ORG_ROLES } from "@/lib/org/roles";

async function orgIsActive(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await admin
    .from("organizations")
    .select("status")
    .eq("id", orgId)
    .maybeSingle();
  return data?.status === "active";
}

/** Active members in org with branch on organization_members (not profiles). */
export async function listActiveMemberUserIdsByBranch(
  admin: SupabaseClient,
  orgId: string,
  branchId: string
): Promise<string[]> {
  if (!(await orgIsActive(admin, orgId))) return [];
  const { data } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .eq("role", ORG_ROLES.MEMBER)
    .eq("branch_id", branchId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function listActiveMemberUserIdsByDepartment(
  admin: SupabaseClient,
  orgId: string,
  departmentId: string
): Promise<string[]> {
  if (!(await orgIsActive(admin, orgId))) return [];
  const { data } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .eq("role", ORG_ROLES.MEMBER)
    .eq("department_id", departmentId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function filterUserIdsByOrgMembershipLocation(
  supabase: SupabaseClient,
  orgId: string,
  userIds: string[],
  branchId?: string,
  departmentId?: string
): Promise<string[]> {
  if (!userIds.length) return [];
  if (!branchId && !departmentId) return userIds;

  let q = supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("user_id", userIds);

  if (branchId) q = q.eq("branch_id", branchId);
  if (departmentId) q = q.eq("department_id", departmentId);

  const { data } = await q;
  return (data ?? []).map((r) => r.user_id as string);
}
