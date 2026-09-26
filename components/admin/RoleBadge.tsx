import { formatRoleLabel } from "@/lib/roles";

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "#5E4DB2", color: "#FFFFFF" },
  manager: { bg: "#0052CC", color: "#FFFFFF" },
  user: { bg: "#DFE1E6", color: "#172B4D" },
};

export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.user;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-atlassian text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {formatRoleLabel(role)}
    </span>
  );
}
