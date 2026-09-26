import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
import { createClient } from "@/lib/supabase/server";
import { CompanyProfileForm } from "@/components/admin/CompanyProfileForm";
import { mergeCompanyProfile, COMPANY_ROW_ID } from "@/lib/company/profile";
import { DEFAULT_COMPANY } from "@/lib/company/constants";

export default async function AdminCompanyPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", COMPANY_ROW_ID)
    .maybeSingle();

  const profile = mergeCompanyProfile(
    error || !data ? null : (data as typeof DEFAULT_COMPANY | null)
  );

  return <CompanyProfileForm initialProfile={profile} />;
}
