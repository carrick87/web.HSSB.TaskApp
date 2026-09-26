import { formatRoleLabel } from "@/lib/roles";
import { formatOrgRoleLabel } from "@/lib/org/roles";

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  owner: { bg: "#5E4DB2", color: "#FFFFFF" },
  admin: { bg: "#5E4DB2", color: "#FFFFFF" },
  super_admin: { bg: "#5E4DB2", color: "#FFFFFF" },
  manager: { bg: "#0052CC", color: "#FFFFFF" },
  member: { bg: "#DFE1E6", color: "#172B4D" },
  user: { bg: "#DFE1E6", color: "#172B4D" },
};

export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.member;
  const label =
    role === "owner" || role === "admin" || role === "manager" || role === "member"
      ? formatOrgRoleLabel(role)
      : formatRoleLabel(role);
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-atlassian text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}
