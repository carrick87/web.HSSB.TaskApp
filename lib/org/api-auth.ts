import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOrgManagerOrAbove, ORG_ROLES } from "@/lib/org/roles";

export type OrgApiContext = {
  orgId: string;
  userId: string;
  role: string;
  branchId: string | null;
  departmentId: string | null;
};

type Ctx = OrgApiContext;

export async function getOrgApiContext(
  requireAdmin = false,
  requireManagerOrAbove = false
): Promise<Ctx | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_org_id, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.status === "deactivated") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = profile.current_org_id as string | null;
  if (!orgId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 403 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, status, branch_id, department_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.status !== "active" || !membership.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = membership.role as string;

  if (requireAdmin && role !== ORG_ROLES.OWNER && role !== ORG_ROLES.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (requireManagerOrAbove && !isOrgManagerOrAbove(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    orgId,
    userId: user.id,
    role,
    branchId: (membership.branch_id as string | null) ?? null,
    departmentId: (membership.department_id as string | null) ?? null,
  };
}
