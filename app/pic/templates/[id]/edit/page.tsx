import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { TemplateForm } from "@/components/templates/TemplateForm";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("task_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !template) notFound();
  if (profile.role === "pic" && template.created_by_profile_id !== profile.id) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("task_template_questions")
    .select("*")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");
  const { data: users } = await supabase.from("profiles").select("id, username").order("username");

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/pic/templates" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
        ← Back to task manager
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Edit template
      </h1>
      <TemplateForm
        template={template}
        questions={questions ?? []}
        branches={branches ?? []}
        departments={departments ?? []}
        staff={users ?? []}
        createdByProfileId={profile.id}
      />
    </div>
  );
}
