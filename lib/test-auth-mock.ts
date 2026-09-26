import type { Profile } from "@/types/database.types";
import type { Organization } from "@/lib/org/context";
import { ORG_ROLES, type OrgRole } from "@/lib/org/roles";

const MOCK_HSSB_ORG_ID = "a1000000-0000-0000-0000-000000000001";

export function buildMockOrgContext(userId: string, role: OrgRole): {
  profile: Profile;
  org: Organization;
  membership: {
    org_id: string;
    user_id: string;
    role: OrgRole;
    branch_id: null;
    department_id: null;
    status: string;
  };
} {
  return {
    profile: {
      id: userId,
      username: role === ORG_ROLES.MEMBER ? "demo_member1" : "admin",
      auth_email: "test-bypass@taskapp.local",
      harrison_email: null,
      role: "super_admin",
      status: "active",
      current_org_id: MOCK_HSSB_ORG_ID,
      branch_id: null,
      department_id: null,
      is_platform_admin: role === ORG_ROLES.OWNER,
    } as Profile,
    org: {
      id: MOCK_HSSB_ORG_ID,
      name: "Harrison Sabah Sdn Bhd",
      short_name: "HSSB",
      slug: "hssb",
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
      org_id: MOCK_HSSB_ORG_ID,
      user_id: userId,
      role,
      branch_id: null,
      department_id: null,
      status: "active",
    },
  };
}

export { MOCK_HSSB_ORG_ID };
