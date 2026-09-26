"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  const [deleteOrg, setDeleteOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: confirmText,
          transfer_owner_to: transferUserId || undefined,
          delete_organization: deleteOrg,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not delete account.");
        return;
      }
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">Account & privacy</h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Required for App Store compliance. Deleting your account removes your memberships and personal profile data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link href="/privacy" className="text-brand-700 hover:underline block">
            Privacy Policy (placeholder)
          </Link>
          <Link href="/terms" className="text-brand-700 hover:underline block">
            Terms of Service (placeholder)
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete my account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={deleteAccount} className="space-y-4 text-sm">
            <p className="text-neutral-800">
              If you are the sole owner of an organization, you must transfer ownership to another member or delete the
              organization.
            </p>
            <div>
              <label className="atlassian-label" htmlFor="transfer">Transfer ownership to (user id, optional)</label>
              <input
                id="transfer"
                className="atlassian-input"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                placeholder="UUID of new owner"
              />
            </div>
            <label className="flex items-center gap-2 min-h-[44px]">
              <input type="checkbox" checked={deleteOrg} onChange={(e) => setDeleteOrg(e.target.checked)} />
              Delete my organization when I am the sole owner (irreversible)
            </label>
            <div>
              <label className="atlassian-label" htmlFor="confirm">Type DELETE to confirm</label>
              <input
                id="confirm"
                className="atlassian-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600">{error}</p>}
            <Button type="submit" variant="secondary" className="min-h-[44px]" disabled={loading || confirmText !== "DELETE"}>
              {loading ? "Deleting…" : "Delete my account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
