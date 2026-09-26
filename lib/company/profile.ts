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
    logo_path: row.logo_path ?? null,
    registration_no: row.registration_no ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    updated_at: row.updated_at ?? null,
    updated_by: row.updated_by ?? null,
  };
}

/** Public branding (login page, manifest, metadata). Uses anon-readable RLS. */
export async function getPublicCompanyProfile(): Promise<CompanyProfile> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_profile")
      .select("name, short_name, logo_path, registration_no, address, phone, email, website, updated_at, updated_by")
      .eq("id", COMPANY_ROW_ID)
      .maybeSingle();
    return mergeCompanyProfile(data as Partial<CompanyProfile> | null);
  } catch {
    return { ...DEFAULT_COMPANY };
  }
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
