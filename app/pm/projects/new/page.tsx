import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createProject, getDepartmentMembers } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function NewProjectPage() {
  const profile = await requireRole(["admin", "pic"]);
  
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const departmentId = profile.department_id;
  let members: Awaited<ReturnType<typeof getDepartmentMembers>> = [];
  if (departmentId) {
    members = await getDepartmentMembers(departmentId);
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const profile = await requireRole(["admin", "pic"]);
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const department_id = formData.get("department_id") as string;
    const memberIds = formData.getAll("members") as string[];

    if (!name || !department_id) {
      return;
    }

    const { project, error } = await createProject({
      name,
      description,
      department_id,
      created_by: profile.id,
      member_ids: memberIds,
    });

    if (error || !project) {
      console.error("Error creating project:", error);
      return;
    }

    redirect(`/pm/projects/${project.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Name *
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Project description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                name="department_id"
                required
                defaultValue={departmentId || ""}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Select department</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {members.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Add Members (optional)
                </label>
                <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="members"
                        value={m.id}
                        defaultChecked={m.id === profile.id}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {m.username}
                        {m.id === profile.id && " (you)"}
                        <span className="text-slate-500 dark:text-slate-400 ml-1">
                          ({m.role})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You will be added automatically as a member.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => history.back()}>
                Cancel
              </Button>
              <Button type="submit">
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
