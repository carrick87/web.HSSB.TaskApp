import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";
import { ROLES, type ProfileRole, LEGACY_ROLE_MAP, normalizeProfileRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, branch:branches(*), department:departments(*)")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  const row = data as Profile & { role: string };
  const normalizedRole = normalizeProfileRole(row.role);
  return { ...row, role: normalizedRole };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=" + encodeURIComponent("/dashboard"));
  return user;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=" + encodeURIComponent("/dashboard"));
  if (profile.status === "deactivated") {
    redirect("/login?error=deactivated");
  }
  return profile;
}

export async function requireRole(allowed: ProfileRole[]) {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) {
    if (profile.role === ROLES.SUPER_ADMIN) redirect("/admin/company");
    if (profile.role === ROLES.MANAGER) redirect("/pic/dashboard");
    redirect("/dashboard");
  }
  return profile;
}

export { requireSuperAdmin } from "@/lib/admin/require-super-admin";
