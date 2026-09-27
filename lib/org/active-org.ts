import type { SupabaseClient } from "@supabase/supabase-js";

/** Active workspace for inserts; relies on profile.current_org_id (set by onboarding / invite). */
export async function getActiveOrgIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.current_org_id) return null;
  return data.current_org_id as string;
}
