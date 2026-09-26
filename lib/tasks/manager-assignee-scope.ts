import type { SupabaseClient } from "@supabase/supabase-js";

/** PIC/manager may act only on assignees in the same branch or department (org membership scoped). */
export async function managerCanAccessAssignee(
  supabase: SupabaseClient,
  assigneeProfileId: string,
  managerBranchId: string | null,
  managerDepartmentId: string | null
): Promise<boolean> {
  const { data: assignee } = await supabase
    .from("profiles")
    .select("branch_id, department_id")
    .eq("id", assigneeProfileId)
    .maybeSingle();

  const sameBranch =
    !!managerBranchId && assignee?.branch_id === managerBranchId;
  const sameDept =
    !!managerDepartmentId && assignee?.department_id === managerDepartmentId;
  return sameBranch || sameDept;
}
