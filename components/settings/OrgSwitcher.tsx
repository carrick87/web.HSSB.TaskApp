"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type OrgOption = {
  org_id: string;
  role: string;
  organizations: { id: string; name: string; short_name: string | null; slug: string } | null;
};

export function OrgSwitcher({
  organizations,
  currentOrgId,
}: {
  organizations: OrgOption[];
  currentOrgId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (organizations.length <= 1) return null;

  async function onChange(orgId: string) {
    if (orgId === currentOrgId || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 mb-3">
      <label className="atlassian-label text-[11px] uppercase tracking-wide">Workspace</label>
      <select
        className="atlassian-select min-h-[44px] w-full mt-1"
        value={currentOrgId}
        disabled={loading}
        onChange={(e) => void onChange(e.target.value)}
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
    </div>
  );
}
