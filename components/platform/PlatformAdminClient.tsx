"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type OrgRow = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  status: string;
  created_at: string;
};

export function PlatformAdminClient({ initialOrganizations }: { initialOrganizations: OrgRow[] }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrganizations);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: "active" | "suspended") {
    setError(null);
    const res = await fetch("/api/platform/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: id, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    router.refresh();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">Platform admin</h1>
        <p className="text-sm text-neutral-700">Suspend or reactivate organizations (TaskApp operator only).</p>
      </div>
      {error && (
        <div className="rounded-atlassian border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-200 text-neutral-700">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-3">{o.name}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{o.slug}</td>
                  <td className="py-3 pr-3">{o.status}</td>
                  <td className="py-3 space-x-2">
                    {o.status === "active" ? (
                      <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => setStatus(o.id, "suspended")}>
                        Suspend
                      </Button>
                    ) : (
                      <Button type="button" className="min-h-[44px]" onClick={() => setStatus(o.id, "active")}>
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
