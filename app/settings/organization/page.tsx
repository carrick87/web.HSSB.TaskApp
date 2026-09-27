import { requireOrgAdmin } from "@/lib/org/context";
import { createClient } from "@/lib/supabase/server";
import { OrganizationSettingsForm } from "@/components/settings/OrganizationSettingsForm";

export default async function OrganizationSettingsPage() {
  const ctx = await requireOrgAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("*").eq("id", ctx.org.id).single();

  return <OrganizationSettingsForm initialOrganization={data ?? ctx.org} orgId={ctx.org.id} />;
}
