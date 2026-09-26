"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CompanyProfile } from "@/lib/company/constants";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";

type Props = {
  initialProfile: CompanyProfile & { id?: string };
};

export function CompanyProfileForm({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState({
    name: initialProfile.name,
    short_name: initialProfile.short_name ?? "",
    registration_no: initialProfile.registration_no ?? "",
    address: initialProfile.address ?? "",
    phone: initialProfile.phone ?? "",
    email: initialProfile.email ?? "",
    website: initialProfile.website ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logoUrl = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return getCompanyLogoPublicUrl(supabaseUrl, profile.logo_path);
  }, [profile.logo_path]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save company profile.");
      return;
    }
    setProfile(data.profile);
    setMessage("Company profile saved.");
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/company/logo", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Logo upload failed.");
      return;
    }
    setProfile(data.profile);
    setMessage("Logo updated.");
  }

  async function removeLogo() {
    setUploading(true);
    setError(null);
    const res = await fetch("/api/admin/company/logo", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to remove logo.");
      return;
    }
    setProfile(data.profile);
    setMessage("Logo removed.");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">Company Profile</h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Update branding shown across the app, login page, and PWA manifest.
        </p>
      </div>

      {error && (
        <div className="rounded-atlassian border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-atlassian border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Brand logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Company logo preview"
                width={80}
                height={80}
                className="h-20 w-20 rounded-atlassian object-contain border border-neutral-200 bg-white"
                unoptimized
              />
            ) : (
              <div className="h-20 w-20 rounded-atlassian bg-brand-700 text-white flex items-center justify-center font-bold">
                {(form.short_name || form.name || "TA").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file);
                    e.currentTarget.value = "";
                  }}
                />
                <span className="inline-flex items-center justify-center rounded-atlassian bg-brand-700 px-4 py-2.5 text-sm font-medium text-white cursor-pointer min-h-[44px]">
                  {uploading ? "Uploading…" : "Replace logo"}
                </span>
              </label>
              {profile.logo_path && (
                <Button type="button" variant="secondary" onClick={removeLogo} disabled={uploading}>
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-700">PNG, JPG, WebP, or SVG up to 2 MB.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="atlassian-label" htmlFor="company-name">Company name</label>
              <input
                id="company-name"
                className="atlassian-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={80}
              />
            </div>
            <div>
              <label className="atlassian-label" htmlFor="short-name">Short name</label>
              <input
                id="short-name"
                className="atlassian-input"
                value={form.short_name}
                onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                maxLength={40}
                placeholder="Used in tight spaces"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="atlassian-label" htmlFor="registration-no">Registration no.</label>
                <input id="registration-no" className="atlassian-input" value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} />
              </div>
              <div>
                <label className="atlassian-label" htmlFor="phone">Phone</label>
                <input id="phone" className="atlassian-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="atlassian-label" htmlFor="address">Address</label>
              <textarea id="address" className="atlassian-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="atlassian-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="atlassian-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="atlassian-label" htmlFor="website">Website</label>
                <input id="website" className="atlassian-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save company profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
