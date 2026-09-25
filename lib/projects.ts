import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectMember, Profile } from "@/types/database.types";

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      department:departments(*),
      creator:profiles!projects_created_by_fkey(*),
      members:project_members(
        *,
        profile:profiles(*)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return (data ?? []) as unknown as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      department:departments(*),
      creator:profiles!projects_created_by_fkey(*),
      members:project_members(
        *,
        profile:profiles(*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    return null;
  }
  return data as unknown as Project;
}

export async function createProject(data: {
  name: string;
  description?: string;
  department_id: string;
  created_by: string;
  member_ids?: string[];
}): Promise<{ project: Project | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: data.name,
      description: data.description || null,
      department_id: data.department_id,
      created_by: data.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return { project: null, error: error.message };
  }

  if (data.member_ids && data.member_ids.length > 0) {
    const memberInserts = data.member_ids.map((profile_id) => ({
      project_id: project.id,
      profile_id,
    }));
    
    const { error: membersError } = await supabase
      .from("project_members")
      .insert(memberInserts);

    if (membersError) {
      console.error("Error adding project members:", membersError);
    }
  }

  if (!data.member_ids?.includes(data.created_by)) {
    await supabase
      .from("project_members")
      .insert({ project_id: project.id, profile_id: data.created_by });
  }

  return { project: project as unknown as Project, error: null };
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating project:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function deleteProject(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function addProjectMember(
  projectId: string,
  profileId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, profile_id: profileId });

  if (error) {
    if (error.code === "23505") {
      return { error: null };
    }
    console.error("Error adding project member:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function removeProjectMember(
  projectId: string,
  profileId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error removing project member:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function getDepartmentMembers(departmentId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("department_id", departmentId)
    .order("username");

  if (error) {
    console.error("Error fetching department members:", error);
    return [];
  }
  return (data ?? []) as Profile[];
}
