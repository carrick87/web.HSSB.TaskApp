import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { TemplateForm } from "@/components/templates/TemplateForm";

export default async function NewTemplatePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");
  const { data: users } = await supabase.from("profiles").select("id, username").order("username");

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/pic/templates" className="text-sm text-brand-700 hover:underline">
        ← Back to task manager
      </Link>
      <h1 className="text-2xl font-bold text-neutral-1000">
        New task template
      </h1>
      <TemplateForm
        branches={branches ?? []}
        departments={departments ?? []}
        staff={users ?? []}
        createdByProfileId={profile.id}
      />
    </div>
  );
}
