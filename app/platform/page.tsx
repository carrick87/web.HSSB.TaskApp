import { requirePlatformAdmin } from "@/lib/org/context";
import { createClient } from "@/lib/supabase/server";
import { PlatformAdminClient } from "@/components/platform/PlatformAdminClient";

export default async function PlatformPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, short_name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return <PlatformAdminClient initialOrganizations={orgs ?? []} />;
}
