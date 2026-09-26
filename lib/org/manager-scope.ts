import type { SupabaseClient } from "@supabase/supabase-js";

/** Assignee IDs visible to a manager in the current org (branch/department on organization_members). */
export async function listUserIdsInManagerScope(
  supabase: SupabaseClient,
  orgId: string,
  branchId: string | null,
  departmentId: string | null
): Promise<string[]> {
  if (!branchId && !departmentId) {
    return [];
  }
  const orFilters: string[] = [];
  if (branchId) orFilters.push(`branch_id.eq.${branchId}`);
  if (departmentId) orFilters.push(`department_id.eq.${departmentId}`);
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .or(orFilters.join(","));
  return (data ?? []).map((r) => r.user_id as string);
}

export const EMPTY_ASSIGNEE_SENTINEL = "00000000-0000-0000-0000-000000000000";

export function assigneeFilterIds(ids: string[]): string {
  return ids.length ? ids.join(",") : `id.eq.${EMPTY_ASSIGNEE_SENTINEL}`;
}
