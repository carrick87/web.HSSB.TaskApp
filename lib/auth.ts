import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";
import { redirect } from "next/navigation";
import { getTestAuthBypassUserId } from "@/lib/test-auth-bypass";
import { buildMockOrgContext } from "@/lib/test-auth-mock";
import { ORG_ROLES, type OrgRole } from "@/lib/org/roles";
import type { ProfileRole } from "@/lib/roles";
import {
  requireOrgAdmin,
  requireOrgContext,
  requireOrgManagerOrAbove,
  legacyOrgContext,
  getActiveOrganization,
} from "@/lib/org/context";

export async function getCurrentUser() {
  const bypassId = await getTestAuthBypassUserId();
  if (bypassId) {
    return { id: bypassId, email: "test-bypass@taskapp.local" } as User;
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const bypassId = await getTestAuthBypassUserId();
  if (bypassId && process.env.TEST_AUTH_MOCK === "1") {
    const memberId = process.env.TEST_AUTH_MEMBER_ID ?? "78925121-0000-4000-8000-000000000006";
    const role = bypassId === memberId ? ORG_ROLES.MEMBER : ORG_ROLES.OWNER;
    return buildMockOrgContext(bypassId, role).profile;
  }

  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, branch:branches(*), department:departments(*)")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function getCurrentOrgRole(): Promise<OrgRole | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const active = await getActiveOrganization(profile.id, profile.current_org_id ?? null);
  if (active) return active.membership.role;
  return legacyOrgContext(profile).membership.role;
}

/** Maps legacy ProfileRole checks to org membership roles */
function legacyAllowedToOrgRoles(allowed: ProfileRole[]): OrgRole[] {
  const set = new Set<OrgRole>();
  for (const a of allowed) {
    if (a === "super_admin") {
      set.add(ORG_ROLES.OWNER);
      set.add(ORG_ROLES.ADMIN);
    } else if (a === "manager") {
      set.add(ORG_ROLES.MANAGER);
      set.add(ORG_ROLES.ADMIN);
      set.add(ORG_ROLES.OWNER);
    } else {
      set.add(ORG_ROLES.MEMBER);
    }
  }
  return [...set];
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
  const orgAllowed = legacyAllowedToOrgRoles(allowed);
  const ctx = await requireOrgContext();
  if (!orgAllowed.includes(ctx.membership.role)) {
    redirect("/dashboard");
  }
  return ctx.profile;
}

export async function requireSuperAdmin() {
  return requireOrgAdmin();
}

export { requireOrgAdmin, requireOrgManagerOrAbove, requireOrgContext, requirePlatformAdmin } from "@/lib/org/context";
