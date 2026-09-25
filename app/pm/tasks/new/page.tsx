import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createTask } from "@/lib/tasks-v2";
import { getProjects, getDepartmentMembers } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const profile = await requireRole(["admin", "pic"]);
  
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const projects = await getProjects();
  
  const departmentId = profile.department_id;
  let members: Awaited<ReturnType<typeof getDepartmentMembers>> = [];
  if (departmentId) {
    members = await getDepartmentMembers(departmentId);
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const profile = await requireRole(["admin", "pic"]);
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as "todo" | "in_progress" | "done";
    const priority = formData.get("priority") as "low" | "medium" | "high";
    const due_date = formData.get("due_date") as string;
    const department_id = formData.get("department_id") as string;
    const project_id = formData.get("project_id") as string;
    const assignee_id = formData.get("assignee_id") as string;

    if (!title || !department_id || !assignee_id) {
      return;
    }

    const { task, error } = await createTask({
      title,
      description,
      status,
      priority,
      due_date: due_date || undefined,
      department_id,
      project_id: project_id || null,
      created_by: profile.id,
      assignee_id,
    });

    if (error || !task) {
      console.error("Error creating task:", error);
      return;
    }

    if (project_id) {
      redirect(`/pm/projects/${project_id}`);
    } else {
      redirect(`/pm/tasks/${task.id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                name="title"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Enter task title"
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
                placeholder="Task description (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue="todo"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  defaultValue="medium"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                name="due_date"
                type="date"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
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

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project (optional)
              </label>
              <select
                name="project_id"
                defaultValue={projectId || ""}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">No project (private task)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Private tasks are only visible to the assignee, you, and admins.
                Project tasks are visible to all project members.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign To *
              </label>
              <select
                name="assignee_id"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Select assignee</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => history.back()}>
                Cancel
              </Button>
              <Button type="submit">
                Create Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
