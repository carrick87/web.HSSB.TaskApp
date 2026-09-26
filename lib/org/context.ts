import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types/database.types";
import type { OrgRole } from "./roles";
import { isOrgAdminRole, isOrgManagerOrAbove, legacyProfileRoleToOrgRole } from "./roles";
import { PRODUCT_BRAND, type Organization } from "./constants";

export type { Organization };
export { PRODUCT_BRAND };

export type OrgMembership = {
  org_id: string;
  user_id: string;
  role: OrgRole;
  branch_id: string | null;
  department_id: string | null;
  status: string;
};

export type OrgContext = {
  profile: Profile;
  org: Organization;
  membership: OrgMembership;
};

export async function getUserOrganizations(userId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_members")
      .select("org_id, role, status, organizations(id, name, short_name, slug, status)")
      .eq("user_id", userId)
      .eq("status", "active");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getActiveOrganization(userId: string, currentOrgId: string | null) {
  const supabase = await createClient();
  if (!currentOrgId) return null;
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", currentOrgId)
    .maybeSingle();
  if (!org || org.status !== "active") return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", currentOrgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership || membership.status !== "active") return null;

  return {
    org: org as Organization,
    membership: {
      ...membership,
      role: membership.role as OrgRole,
    } as OrgMembership,
  };
}

/** Fallback when DB not migrated: synthetic HSSB-like org from legacy profile.role */
export function legacyOrgContext(profile: Profile): OrgContext {
  const role = legacyProfileRoleToOrgRole(profile.role as string);
  return {
    profile,
    org: {
      id: profile.current_org_id ?? "legacy",
      name: "TaskApp Workspace",
      short_name: "TaskApp",
      slug: "legacy",
      logo_wide_path: null,
      logo_square_path: null,
      registration_no: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      status: "active",
    },
    membership: {
      org_id: profile.current_org_id ?? "legacy",
      user_id: profile.id,
      role,
      branch_id: profile.branch_id,
      department_id: profile.department_id,
      status: profile.status ?? "active",
    },
  };
}

export async function requireOrgContext(): Promise<OrgContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, branch:branches(*), department:departments(*)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.status === "deactivated") redirect("/login?error=deactivated");

  const active = await getActiveOrganization(user.id, profile.current_org_id);
  if (active) {
    return { profile: profile as Profile, org: active.org, membership: active.membership };
  }

  // Not migrated yet or no org — onboarding
  if (!profile.current_org_id) {
    redirect("/onboarding/workspace");
  }

  return legacyOrgContext(profile as Profile);
}

export async function requireOrgAdmin() {
  const ctx = await requireOrgContext();
  if (!isOrgAdminRole(ctx.membership.role)) redirect("/dashboard");
  return ctx;
}

export async function requireOrgManagerOrAbove() {
  const ctx = await requireOrgContext();
  if (!isOrgManagerOrAbove(ctx.membership.role)) redirect("/dashboard");
  return ctx;
}

export async function requireOrgRole(allowed: OrgRole[]) {
  const ctx = await requireOrgContext();
  if (!allowed.includes(ctx.membership.role)) redirect("/dashboard");
  return ctx;
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", user.id).single();
  if (!profile?.is_platform_admin) redirect("/dashboard");
}

export async function getPublicOrgBranding(orgId: string | null) {
  if (!orgId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("name, short_name, logo_wide_path, logo_square_path")
      .eq("id", orgId)
      .eq("status", "active")
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}
