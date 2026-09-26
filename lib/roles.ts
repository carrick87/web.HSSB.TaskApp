export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  USER: "user",
} as const;

export type ProfileRole = (typeof ROLES)[keyof typeof ROLES];

export const LEGACY_ROLE_MAP: Record<string, ProfileRole> = {
  admin: ROLES.SUPER_ADMIN,
  pic: ROLES.MANAGER,
  staff: ROLES.USER,
};

export function normalizeProfileRole(role: string): ProfileRole {
  return (LEGACY_ROLE_MAP[role] ?? role) as ProfileRole;
}

export function isSuperAdmin(role: string): boolean {
  return normalizeProfileRole(role) === ROLES.SUPER_ADMIN;
}

export function isManager(role: string): boolean {
  return normalizeProfileRole(role) === ROLES.MANAGER;
}

export function isUser(role: string): boolean {
  return normalizeProfileRole(role) === ROLES.USER;
}

/** Manager-level tools (formerly pic); super_admin inherits these capabilities in app checks. */
export function isManagerOrAbove(role: string): boolean {
  return isSuperAdmin(role) || isManager(role);
}

export function formatRoleLabel(role: string): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "Super Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.USER:
      return "User";
    default:
      return role;
  }
}
