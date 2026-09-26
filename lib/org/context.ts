import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types/database.types";
import type { OrgRole } from "./roles";
import { isOrgAdminRole, isOrgManagerOrAbove, legacyProfileRoleToOrgRole, ORG_ROLES } from "./roles";
import { PRODUCT_BRAND, type Organization } from "./constants";
import { getCurrentUser } from "@/lib/auth";
import { getTestAuthBypassUserId } from "@/lib/test-auth-bypass";
import { isPlatformAdmin } from "@/lib/platform-admin";
import {
  fetchMyOrgStatus,
  fetchMyWorkspaces,
  pickAlternateActiveWorkspace,
  switchCurrentOrg,
} from "@/lib/org/workspace-access";

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

import { buildMockOrgContext, MOCK_HSSB_ORG_ID } from "@/lib/test-auth-mock";

export async function getUserOrganizations(userId: string) {
  if (process.env.TEST_AUTH_MOCK === "1" && (await getTestAuthBypassUserId())) {
    return [
      {
        org_id: MOCK_HSSB_ORG_ID,
        role: ORG_ROLES.OWNER,
        status: "active",
        organizations: { id: MOCK_HSSB_ORG_ID, name: "Harrison Sabah Sdn Bhd", short_name: "HSSB", slug: "hssb", status: "active" },
      },
      {
        org_id: "b2000000-0000-0000-0000-000000000002",
        role: ORG_ROLES.MEMBER,
        status: "active",
        organizations: { id: "b2000000-0000-0000-0000-000000000002", name: "Demo Org Two", short_name: "DEMO2", slug: "demo-two", status: "active" },
      },
    ];
  }
  try {
    const supabase = await createClient();
    const rows = await fetchMyWorkspaces(supabase);
    return rows
      .filter((w) => w.membership_status === "active" && w.org_status === "active")
      .map((w) => ({
        org_id: w.org_id,
        role: w.membership_role,
        status: w.membership_status,
        organizations: {
          id: w.org_id,
          name: w.org_name,
          short_name: w.org_short_name,
          slug: "",
          status: w.org_status,
        },
      }));
  } catch {
    return [];
  }
}

export async function getActiveOrganization(userId: string, currentOrgId: string | null) {
  const supabase = await createClient();
  if (!currentOrgId) return null;

  const status = await fetchMyOrgStatus(supabase, currentOrgId);
  if (
    !status ||
    status.org_status !== "active" ||
    status.membership_status !== "active"
  ) {
    return null;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", currentOrgId)
    .maybeSingle();
  if (!org) return null;

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
  const bypassId = await getTestAuthBypassUserId();
  if (bypassId && process.env.TEST_AUTH_MOCK === "1") {
    const memberId = process.env.TEST_AUTH_MEMBER_ID ?? "78925121-0000-4000-8000-000000000006";
    const role = bypassId === memberId ? ORG_ROLES.MEMBER : ORG_ROLES.OWNER;
    return buildMockOrgContext(bypassId, role);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, branch:branches(*), department:departments(*)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const platformAdminFlag = await isPlatformAdmin(supabase);
  const profileWithPlatform = {
    ...(profile as Profile),
    is_platform_admin: platformAdminFlag,
  };

  const workspaces = await fetchMyWorkspaces(supabase);
  const hasMemberships = workspaces.length > 0;

  if (profile.status === "deactivated") {
    const activeCount = workspaces.filter(
      (w) => w.membership_status === "active" && w.org_status === "active"
    ).length;
    if (activeCount === 0) {
      redirect("/login?error=deactivated");
    }
  }

  const active = await getActiveOrganization(user.id, profile.current_org_id);
  if (active) {
    return { profile: profileWithPlatform, org: active.org, membership: active.membership };
  }

  if (profile.current_org_id && hasMemberships) {
    const currentStatus = await fetchMyOrgStatus(supabase, profile.current_org_id);
    const alternate = pickAlternateActiveWorkspace(workspaces, profile.current_org_id);

    if (alternate) {
      const switched = await switchCurrentOrg(supabase, user.id, alternate.org_id);
      if (switched.ok) {
        redirect("/dashboard");
      }
    }

    if (currentStatus && currentStatus.org_status !== "active" && !platformAdminFlag) {
      redirect("/workspace-suspended");
    }

    redirect("/workspace-deactivated");
  }

  if (!profile.current_org_id) {
    if (hasMemberships) redirect("/onboarding/workspace");
    redirect("/onboarding/workspace");
  }

  if (hasMemberships) {
    redirect("/workspace-deactivated");
  }

  return legacyOrgContext(profileWithPlatform);
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
  if (!(await isPlatformAdmin(supabase))) redirect("/dashboard");
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
