import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COMPANY, type CompanyProfile } from "./constants";

const COMPANY_ROW_ID = "00000000-0000-0000-0000-000000000001";

export function mergeCompanyProfile(row: Partial<CompanyProfile> | null): CompanyProfile {
  if (!row) return { ...DEFAULT_COMPANY };
  return {
    name: row.name?.trim() || DEFAULT_COMPANY.name,
    short_name: row.short_name?.trim() || row.name?.trim() || DEFAULT_COMPANY.short_name,
    tagline: DEFAULT_COMPANY.tagline,
    logo_wide_path:
      row.logo_wide_path ?? row.logo_path ?? null,
    logo_square_path: row.logo_square_path ?? null,
    registration_no: row.registration_no ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    updated_at: row.updated_at ?? null,
    updated_by: row.updated_by ?? null,
  };
}

/** Authenticated app shell: active organization branding. */
export async function getActiveOrgCompanyProfile(): Promise<CompanyProfile> {
  try {
    const { getCurrentProfile } = await import("@/lib/auth");
    const { getActiveOrganization, legacyOrgContext } = await import("@/lib/org/context");
    const { organizationToCompanyProfile, productBrandAsCompanyProfile } = await import(
      "@/lib/org/branding"
    );
    const profile = await getCurrentProfile();
    if (!profile) return productBrandAsCompanyProfile();
    const active = await getActiveOrganization(profile.id, profile.current_org_id ?? null);
    if (active) return organizationToCompanyProfile(active.org);
    return organizationToCompanyProfile(legacyOrgContext(profile).org);
  } catch {
    return { ...DEFAULT_COMPANY };
  }
}

/** Public branding (login page, manifest, metadata). Uses anon-readable RLS. */
export async function getPublicCompanyProfile(): Promise<CompanyProfile> {
  const { productBrandAsCompanyProfile } = await import("@/lib/org/branding");
  try {
    const supabase = await createClient();
    const { data: org } = await supabase
      .from("organizations")
      .select(
        "name, short_name, logo_wide_path, logo_square_path, registration_no, address, phone, email, website"
      )
      .eq("slug", "hssb")
      .eq("status", "active")
      .maybeSingle();
    if (org) {
      return mergeCompanyProfile(org as Partial<CompanyProfile>);
    }
    const { data } = await supabase
      .from("company_profile")
      .select(
        "name, short_name, logo_wide_path, logo_square_path, registration_no, address, phone, email, website, updated_at, updated_by"
      )
      .eq("id", COMPANY_ROW_ID)
      .maybeSingle();
    if (data) return mergeCompanyProfile(data as Partial<CompanyProfile>);
  } catch {
    /* tables may not exist pre-migration */
  }
  return productBrandAsCompanyProfile();
}

/** Server-only read when RLS blocks (fallback). */
export async function getCompanyProfileAdmin(): Promise<CompanyProfile> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("company_profile")
      .select("*")
      .eq("id", COMPANY_ROW_ID)
      .maybeSingle();
    return mergeCompanyProfile(data as Partial<CompanyProfile> | null);
  } catch {
    return getPublicCompanyProfile();
  }
}

export { getCompanyLogoPublicUrl } from "./logo-url";

export { COMPANY_ROW_ID };
