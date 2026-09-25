import { createClient } from "@/lib/supabase/server";
import type { Task, TaskAttachment, TaskComment } from "@/types/database.types";

export async function getTasks(filters?: {
  assigneeId?: string;
  createdBy?: string;
  projectId?: string | null;
  status?: string;
  departmentId?: string;
}): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(`
      *,
      department:departments(*),
      project:projects(*),
      creator:profiles!tasks_created_by_fkey(*),
      assignee:profiles!tasks_assignee_id_fkey(*),
      attachments:task_attachments(*),
      comments:task_comments(*, author:profiles(*))
    `)
    .order("created_at", { ascending: false });

  if (filters?.assigneeId) {
    query = query.eq("assignee_id", filters.assigneeId);
  }
  if (filters?.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }
  if (filters?.projectId !== undefined) {
    if (filters.projectId === null) {
      query = query.is("project_id", null);
    } else {
      query = query.eq("project_id", filters.projectId);
    }
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
  return (data ?? []) as unknown as Task[];
}

export async function getMyTasks(profileId: string): Promise<Task[]> {
  return getTasks({ assigneeId: profileId });
}

export async function getTeamTasks(departmentId: string): Promise<Task[]> {
  return getTasks({ departmentId });
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return getTasks({ projectId });
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      department:departments(*),
      project:projects(*),
      creator:profiles!tasks_created_by_fkey(*),
      assignee:profiles!tasks_assignee_id_fkey(*),
      attachments:task_attachments(*, uploader:profiles(*)),
      comments:task_comments(*, author:profiles(*))
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching task:", error);
    return null;
  }
  return data as unknown as Task;
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  due_date?: string;
  department_id: string;
  project_id?: string | null;
  created_by: string;
  assignee_id: string;
}): Promise<{ task: Task | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: data.title,
      description: data.description || null,
      status: data.status || "todo",
      priority: data.priority || "medium",
      due_date: data.due_date || null,
      department_id: data.department_id,
      project_id: data.project_id || null,
      created_by: data.created_by,
      assignee_id: data.assignee_id,
    })
    .select(`
      *,
      department:departments(*),
      project:projects(*),
      creator:profiles!tasks_created_by_fkey(*),
      assignee:profiles!tasks_assignee_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error("Error creating task:", error);
    return { task: null, error: error.message };
  }

  return { task: task as unknown as Task, error: null };
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high";
    due_date?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating task:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting task:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function addTaskComment(
  taskId: string,
  authorId: string,
  content: string
): Promise<{ comment: TaskComment | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: authorId,
      content,
    })
    .select(`*, author:profiles(*)`)
    .single();

  if (error) {
    console.error("Error adding comment:", error);
    return { comment: null, error: error.message };
  }
  return { comment: data as unknown as TaskComment, error: null };
}

export async function deleteTaskComment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting comment:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function addTaskAttachment(data: {
  task_id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  content_type?: string;
  uploaded_by: string;
}): Promise<{ attachment: TaskAttachment | null; error: string | null }> {
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("task_attachments")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error adding attachment:", error);
    return { attachment: null, error: error.message };
  }
  return { attachment: attachment as TaskAttachment, error: null };
}

export async function deleteTaskAttachment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting attachment:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function checkTablesExist(): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("tasks")
      .select("id")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
