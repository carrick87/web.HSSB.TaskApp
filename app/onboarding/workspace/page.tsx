"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/branding/BrandMark";
import { productBrandAsCompanyProfile } from "@/lib/org/branding";

export default function OnboardingWorkspacePage() {
  const router = useRouter();
  const brand = productBrandAsCompanyProfile();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), short_name: shortName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create workspace.");
        return;
      }
      router.push("/onboarding/invite");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-atlassian shadow-atlassian-md p-8">
      <div className="flex justify-center mb-4">
        <BrandMark company={brand} size="lg" showName={false} />
      </div>
      <h1 className="text-xl font-semibold text-center mb-1">Create your workspace</h1>
      <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
        Step 2 of 3 — name your workspace. You can add a logo later in settings.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="atlassian-label" htmlFor="org-name">
            Workspace name
          </label>
          <input
            id="org-name"
            className="atlassian-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div>
          <label className="atlassian-label" htmlFor="short-name">
            Short name (optional)
          </label>
          <input
            id="short-name"
            className="atlassian-input"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            maxLength={30}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
          {loading ? "Creating…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
