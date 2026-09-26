"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { productBrandAsCompanyProfile } from "@/lib/org/branding";
import { BrandMark } from "@/components/branding/BrandMark";

export default function CreateOrgOnboardingPage() {
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
        setError(data.error ?? "Could not create organization.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <div className="w-full max-w-md bg-white rounded-atlassian shadow-atlassian-md p-8">
        <div className="flex justify-center mb-4">
          <BrandMark company={brand} size="lg" showName={false} />
        </div>
        <h1 className="text-xl font-semibold text-neutral-1000 mb-1 text-center">Create your organization</h1>
        <p className="text-sm text-neutral-700 mb-6 text-center">
          TaskApp workspaces are separate. You will be the owner and can invite teammates next.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="atlassian-label" htmlFor="org-name">Organization name</label>
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
            <label className="atlassian-label" htmlFor="short-name">Short name (optional)</label>
            <input
              id="short-name"
              className="atlassian-input"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              maxLength={30}
              placeholder="Shown on mobile header"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
            {loading ? "Creating…" : "Continue to TaskApp"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-neutral-700 text-center">
          By continuing you agree to our{" "}
          <Link href="/terms" className="text-brand-700 hover:underline">Terms</Link> and{" "}
          <Link href="/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link> (placeholders).
        </p>
      </div>
    </main>
  );
}
