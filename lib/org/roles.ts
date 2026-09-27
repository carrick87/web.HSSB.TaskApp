export const ORG_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
} as const;

export type OrgRole = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

export function formatOrgRoleLabel(role: string): string {
  switch (role) {
    case ORG_ROLES.OWNER:
      return "Owner";
    case ORG_ROLES.ADMIN:
      return "Admin";
    case ORG_ROLES.MANAGER:
      return "Manager";
    case ORG_ROLES.MEMBER:
      return "Member";
    default:
      return role;
  }
}

export function isOrgAdminRole(role: string): boolean {
  return role === ORG_ROLES.OWNER || role === ORG_ROLES.ADMIN;
}

export function isOrgManagerOrAbove(role: string): boolean {
  return isOrgAdminRole(role) || role === ORG_ROLES.MANAGER;
}

export function isElevatedOrgRole(role: string): boolean {
  return isOrgManagerOrAbove(role);
}

/** Map legacy profile.role values to org roles for migration period */
export function legacyProfileRoleToOrgRole(role: string): OrgRole {
  if (role === "admin" || role === "super_admin") return ORG_ROLES.OWNER;
  if (role === "pic" || role === "manager") return ORG_ROLES.MANAGER;
  return ORG_ROLES.MEMBER;
}
