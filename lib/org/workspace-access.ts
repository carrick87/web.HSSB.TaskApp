import type { SupabaseClient } from "@supabase/supabase-js";

export type MyOrgStatusRow = {
  org_id: string;
  org_name: string;
  org_status: string;
  membership_status: string;
  membership_role: string;
};

export type MyWorkspaceRow = MyOrgStatusRow & {
  org_short_name: string | null;
};

export async function fetchMyOrgStatus(
  supabase: SupabaseClient,
  orgId: string
): Promise<MyOrgStatusRow | null> {
  const { data, error } = await supabase.rpc("my_org_status", { p_org_id: orgId });
  if (error || !data?.length) return null;
  return data[0] as MyOrgStatusRow;
}

export async function fetchMyWorkspaces(supabase: SupabaseClient): Promise<MyWorkspaceRow[]> {
  const { data, error } = await supabase.rpc("my_workspaces");
  if (error || !data) return [];
  return data as MyWorkspaceRow[];
}

export function pickAlternateActiveWorkspace(
  workspaces: MyWorkspaceRow[],
  excludeOrgId: string | null
): MyWorkspaceRow | null {
  return (
    workspaces.find(
      (w) =>
        w.org_status === "active" &&
        w.membership_status === "active" &&
        w.org_id !== excludeOrgId
    ) ?? null
  );
}

export async function switchCurrentOrg(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<{ ok: boolean; error?: string }> {
  const status = await fetchMyOrgStatus(supabase, orgId);
  if (
    !status ||
    status.org_status !== "active" ||
    status.membership_status !== "active"
  ) {
    return { ok: false, error: "Not an active member of that workspace" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ current_org_id: orgId })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
