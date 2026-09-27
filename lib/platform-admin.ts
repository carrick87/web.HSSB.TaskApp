import type { SupabaseClient } from "@supabase/supabase-js";

/** Platform admin = row in platform_admins (public.is_platform_admin()). */
export async function isPlatformAdmin(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
}
