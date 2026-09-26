import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ReportsForm } from "@/components/templates/ReportsForm";

export default async function PicReportsPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name, branch_id").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-1000">
        Reports
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Export to Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsForm
            branches={branches ?? []}
            departments={departments ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
