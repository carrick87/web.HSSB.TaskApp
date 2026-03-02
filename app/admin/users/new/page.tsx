import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function AdminNewUserPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");

  return (
    <div className="space-y-6 max-w-lg">
      <Link href="/admin/users" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
        ← Back to users
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Create user
      </h1>
      <CreateUserForm branches={branches ?? []} departments={departments ?? []} />
    </div>
  );
}
