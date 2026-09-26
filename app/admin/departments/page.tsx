import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DepartmentsForm } from "@/components/admin/DepartmentsForm";
import { DepartmentRow } from "@/components/admin/DepartmentRow";

export default async function AdminDepartmentsPage() {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, branch_id, branch:branches(name)")
    .order("name");
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-1000">
        Departments
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>All departments</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-neutral-200 mb-6">
            {(departments ?? []).map((d) => (
              <DepartmentRow key={d.id} department={d} branches={branches ?? []} />
            ))}
          </ul>
          <DepartmentsForm branches={branches ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
