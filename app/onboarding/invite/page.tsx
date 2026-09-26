"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function OnboardingInvitePage() {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendInvites(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const list = emails
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) {
        const res = await fetch("/api/onboarding/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: list }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not send invites.");
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-atlassian shadow-atlassian-md p-8">
      <h1 className="text-xl font-semibold text-center mb-1">Invite teammates</h1>
      <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
        Step 3 of 3 — optional. Add emails or skip and invite people later from Members.
      </p>
      <form onSubmit={sendInvites} className="space-y-4">
        <div>
          <label className="atlassian-label" htmlFor="emails">
            Email addresses
          </label>
          <textarea
            id="emails"
            className="atlassian-textarea min-h-[120px]"
            placeholder="one@company.com, teammate@company.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
          {loading ? "Sending…" : "Send invites & finish"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full min-h-[44px]"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        >
          Skip for now
        </Button>
      </form>
    </div>
  );
}
