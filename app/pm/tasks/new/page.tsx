import { requireOrgManagerOrAbove, requireOrgContext } from "@/lib/auth";
import { isOrgAdminRole } from "@/lib/org/roles";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createTask } from "@/lib/tasks-v2";
import { notifyTaskAssigned } from "@/lib/notifications/task-events";
import { getProjects } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskNewForm } from "@/components/pm/TaskNewForm";
import type { Profile } from "@/types/database.types";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const pageCtx = await requireOrgManagerOrAbove();
  const profile = pageCtx.profile;

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const projects = await getProjects();

  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, username, role, department_id")
    .order("username");

  async function handleCreate(formData: FormData) {
    "use server";
    const actionCtx = await requireOrgManagerOrAbove();
    const profile = actionCtx.profile;
    const orgCtx = await requireOrgContext();

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

    await notifyTaskAssigned({
      orgId: orgCtx.org.id,
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: assignee_id,
      actorId: profile.id,
      previousAssigneeId: null,
    });

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
          <TaskNewForm
            departments={(departments ?? []) as { id: string; name: string }[]}
            projects={projects}
            allMembers={(allMembers ?? []) as Profile[]}
            defaultDepartmentId={profile.department_id}
            defaultProjectId={projectId || null}
            isAdmin={isOrgAdminRole(pageCtx.membership.role)}
            handleCreate={handleCreate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
