import { requireOrgManagerOrAbove } from "@/lib/auth";
import { isOrgAdminRole, ORG_ROLES } from "@/lib/org/roles";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createProject } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProjectNewForm } from "@/components/pm/ProjectNewForm";
import type { Profile } from "@/types/database.types";

export default async function NewProjectPage() {
  const ctx = await requireOrgManagerOrAbove();
  const profile = ctx.profile;

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, username, role, department_id")
    .order("username");

  async function handleCreate(formData: FormData) {
    "use server";
    const actionCtx = await requireOrgManagerOrAbove();
    const profile = actionCtx.profile;

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
          <ProjectNewForm
            departments={(departments ?? []) as { id: string; name: string }[]}
            allMembers={(allMembers ?? []) as Profile[]}
            defaultDepartmentId={profile.department_id}
            currentUserId={profile.id}
            isAdmin={isOrgAdminRole(ctx.membership.role)}
            handleCreate={handleCreate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
