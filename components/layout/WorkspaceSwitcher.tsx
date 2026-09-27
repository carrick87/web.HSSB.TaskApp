"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrgOption = {
  org_id: string;
  organizations: { name: string; short_name: string | null } | null;
};

export function WorkspaceSwitcher({
  organizations,
  currentOrgId,
  workspaceName,
}: {
  organizations: OrgOption[];
  currentOrgId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const multi = organizations.length > 1;

  async function onChange(orgId: string) {
    if (orgId === currentOrgId || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!multi) {
    return (
      <span className="font-medium text-sm truncate max-w-[160px]" style={{ color: "var(--text-primary)" }} title={workspaceName}>
        {workspaceName}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-1 min-w-0 max-w-[200px]">
      <span className="sr-only">Switch workspace</span>
      <select
        className="text-sm font-medium truncate bg-transparent border-0 min-h-[44px] max-w-full cursor-pointer"
        style={{ color: "var(--text-primary)" }}
        value={currentOrgId}
        disabled={loading}
        onChange={(e) => void onChange(e.target.value)}
        aria-label="Switch workspace"
      >
        {organizations.map((o) => {
          const org = o.organizations;
          const label = org?.short_name?.trim() || org?.name || o.org_id;
          return (
            <option key={o.org_id} value={o.org_id}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
