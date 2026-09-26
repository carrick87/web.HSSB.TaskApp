import type { SupabaseClient } from "@supabase/supabase-js";

/** PIC/manager may act only on assignees in the same branch or department (org membership scoped). */
export async function managerCanAccessAssignee(
  supabase: SupabaseClient,
  orgId: string,
  assigneeProfileId: string,
  managerBranchId: string | null,
  managerDepartmentId: string | null
): Promise<boolean> {
  const { data: assigneeMembership } = await supabase
    .from("organization_members")
    .select("branch_id, department_id")
    .eq("org_id", orgId)
    .eq("user_id", assigneeProfileId)
    .eq("status", "active")
    .maybeSingle();

  if (!assigneeMembership) return false;

  const sameBranch =
    !!managerBranchId && assigneeMembership.branch_id === managerBranchId;
  const sameDept =
    !!managerDepartmentId && assigneeMembership.department_id === managerDepartmentId;
  return sameBranch || sameDept;
}
