"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CompanyProfile } from "@/lib/company/constants";
import { COMPANY_SHORT_NAME_MAX_LENGTH } from "@/lib/company/constants";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";
import { MockTopBarPreview } from "@/components/branding/MockTopBarPreview";

type Props = {
  initialProfile: CompanyProfile & { id?: string };
};

function formSnapshot(form: Record<string, string>) {
  return JSON.stringify(form);
}

export function CompanyProfileForm({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const initialForm = useMemo(
    () => ({
      name: initialProfile.name,
      short_name: initialProfile.short_name ?? "",
      registration_no: initialProfile.registration_no ?? "",
      address: initialProfile.address ?? "",
      phone: initialProfile.phone ?? "",
      email: initialProfile.email ?? "",
      website: initialProfile.website ?? "",
    }),
    [initialProfile]
  );
  const [form, setForm] = useState(initialForm);
  const [savedSnapshot, setSavedSnapshot] = useState(() => formSnapshot(initialForm));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"wide" | "square" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = formSnapshot(form) !== savedSnapshot;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const wideUrl = getCompanyLogoPublicUrl(supabaseUrl, profile.logo_wide_path);
  const squareUrl = getCompanyLogoPublicUrl(supabaseUrl, profile.logo_square_path);
  const initials = (form.short_name || form.name || "TA").slice(0, 2).toUpperCase();

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const guardNavigation = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  }, [isDirty]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || !isDirty) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (!guardNavigation()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, guardNavigation]);

  async function saveProfile(e?: React.FormEvent) {
    e?.preventDefault();
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
    setSavedSnapshot(formSnapshot(form));
    setMessage("Company profile saved.");
    router.refresh();
  }

  async function uploadLogo(variant: "wide" | "square", file: File) {
    setUploading(variant);
    setError(null);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    body.append("variant", variant);
    const res = await fetch("/api/admin/company/logo", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(null);
    if (!res.ok) {
      setError(data.error ?? "Logo upload failed.");
      return;
    }
    setProfile(data.profile);
    setMessage(variant === "wide" ? "Wide logo updated." : "Square icon updated.");
    router.refresh();
  }

  async function removeLogo(variant: "wide" | "square") {
    setUploading(variant);
    setError(null);
    const res = await fetch(`/api/admin/company/logo?variant=${variant}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setUploading(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to remove logo.");
      return;
    }
    setProfile(data.profile);
    setMessage("Logo removed.");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl pb-28 lg:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">Company Profile</h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Branding for the app header, login page, and installed PWA.
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
      {isDirty && (
        <div className="rounded-atlassian border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          You have unsaved changes.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <MockTopBarPreview
            company={profile}
            previewName={form.name}
            previewShortName={form.short_name}
            previewWidePath={profile.logo_wide_path}
          />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Wide logo</h3>
            <p className="text-xs text-neutral-700">Used in the header and login page. PNG, JPG, or SVG up to 1 MB.</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {wideUrl ? (
                <Image src={wideUrl} alt="Wide logo" width={160} height={48} className="h-12 w-auto max-w-[200px] object-contain" unoptimized />
              ) : (
                <div className="h-12 px-4 rounded-atlassian bg-brand-700 text-white flex items-center justify-center font-bold">
                  {initials}
                </div>
              )}
              <LogoActions
                uploading={uploading === "wide"}
                hasLogo={!!profile.logo_wide_path}
                accept="image/png,image/jpeg,image/svg+xml"
                onUpload={(f) => uploadLogo("wide", f)}
                onRemove={() => removeLogo("wide")}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Square icon</h3>
            <p className="text-xs text-neutral-700">PWA, favicon, and Apple touch icon. At least 512×512 px. PNG, JPG, or SVG up to 1 MB.</p>
            <p className="text-xs text-neutral-700 italic">
              Installed apps show the new icon after reopening or reinstalling.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {squareUrl ? (
                <Image src={squareUrl} alt="Square icon" width={80} height={80} className="h-20 w-20 rounded-atlassian object-contain border border-neutral-200" unoptimized />
              ) : (
                <div className="h-20 w-20 rounded-atlassian bg-brand-700 text-white flex items-center justify-center font-bold text-lg">
                  {initials}
                </div>
              )}
              <LogoActions
                uploading={uploading === "square"}
                hasLogo={!!profile.logo_square_path}
                accept="image/png,image/jpeg,image/svg+xml"
                onUpload={(f) => uploadLogo("square", f)}
                onRemove={() => removeLogo("square")}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
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
              <label className="atlassian-label" htmlFor="short-name">Short name (top bar on phones)</label>
              <input
                id="short-name"
                className="atlassian-input"
                value={form.short_name}
                onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                maxLength={COMPANY_SHORT_NAME_MAX_LENGTH}
                placeholder={`Max ${COMPANY_SHORT_NAME_MAX_LENGTH} characters`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="atlassian-label" htmlFor="phone">Phone</label>
              <input id="phone" className="atlassian-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="atlassian-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="atlassian-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="atlassian-label" htmlFor="website">Website</label>
            <input id="website" className="atlassian-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="atlassian-label" htmlFor="registration-no">Registration no.</label>
            <input id="registration-no" className="atlassian-input" value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} />
          </div>
          <div>
            <label className="atlassian-label" htmlFor="address">Address</label>
            <textarea id="address" className="atlassian-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="hidden lg:flex justify-end">
        <Button type="button" onClick={() => saveProfile()} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save company profile"}
        </Button>
      </div>

      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200 px-4 pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <Button type="button" className="w-full min-h-[44px]" onClick={() => saveProfile()} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save company profile"}
        </Button>
      </div>
    </div>
  );
}

function LogoActions({
  uploading,
  hasLogo,
  accept,
  onUpload,
  onRemove,
}: {
  uploading: boolean;
  hasLogo: boolean;
  accept: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.currentTarget.value = "";
          }}
        />
        <span className="inline-flex items-center justify-center rounded-atlassian bg-brand-700 px-4 py-2.5 text-sm font-medium text-white cursor-pointer min-h-[44px]">
          {uploading ? "Uploading…" : "Replace"}
        </span>
      </label>
      {hasLogo && (
        <Button type="button" variant="secondary" onClick={onRemove} disabled={uploading} className="min-h-[44px]">
          Remove
        </Button>
      )}
    </div>
  );
}
