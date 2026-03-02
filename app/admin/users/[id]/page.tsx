import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EditUserForm } from "@/components/admin/EditUserForm";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, harrison_email, role, branch_id, department_id")
    .eq("id", id)
    .single();
  if (error || !profile) notFound();

  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");

  return (
    <div className="space-y-6 max-w-lg">
      <Link href="/admin/users" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
        ← Back to users
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Edit user
      </h1>
      <EditUserForm
        profile={profile}
        branches={branches ?? []}
        departments={departments ?? []}
      />
    </div>
  );
}
