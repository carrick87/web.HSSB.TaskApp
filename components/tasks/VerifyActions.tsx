"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function VerifyActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"verify" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setLoading("verify");
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed");
        return;
      }
      router.refresh();
      router.push("/pic/verify");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setLoading("reject");
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed");
        return;
      }
      router.refresh();
      router.push("/pic/verify");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="pt-4 border-t border-neutral-200 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleVerify}
          disabled={!!loading}
        >
          {loading === "verify" ? "Verifying…" : "Verify"}
        </Button>
        <form onSubmit={handleReject} className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            placeholder="Rejection comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm w-64"
          />
          <Button type="submit" variant="danger" disabled={!!loading}>
            {loading === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        </form>
      </div>
    </div>
  );
}
