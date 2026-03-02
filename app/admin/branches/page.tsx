import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BranchesForm } from "@/components/admin/BranchesForm";
import { BranchRow } from "@/components/admin/BranchRow";

export default async function AdminBranchesPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Branches
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>All branches</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 mb-6">
            {(branches ?? []).map((b) => (
              <BranchRow key={b.id} branch={b} />
            ))}
          </ul>
          <BranchesForm />
        </CardContent>
      </Card>
    </div>
  );
}
