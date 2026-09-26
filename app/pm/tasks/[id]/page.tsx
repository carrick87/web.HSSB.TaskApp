import { requireProfile, requireOrgContext } from "@/lib/auth";
import { getTask, updateTask, addTaskComment, deleteTaskComment } from "@/lib/tasks-v2";
import { createClient } from "@/lib/supabase/server";
import {
  notifyTaskComment,
  notifyTaskStatusChange,
} from "@/lib/notifications/task-events";
import { TaskWatchToggle } from "@/components/pm/TaskWatchToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/pm/TaskBadges";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TaskAttachments } from "@/components/pm/TaskAttachments";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const ctx = await requireOrgContext();
  
  const task = await getTask(id);
  if (!task) {
    notFound();
  }

  const isAssignee = task.assignee_id === profile.id;
  const isCreator = task.created_by === profile.id;
  const isSuperAdmin = profile.role === "super_admin";
  const canEdit = isAssignee || isCreator || isSuperAdmin;

  const supabase = await createClient();
  const { data: watchRow } = await supabase
    .from("task_watchers")
    .select("user_id")
    .eq("task_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  const isWatching = Boolean(watchRow);

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const profile = await requireProfile();
    const ctx = await requireOrgContext();
    const status = formData.get("status") as "todo" | "in_progress" | "done";
    const before = await getTask(id);
    if (!before) return;
    await updateTask(id, { status });
    await notifyTaskStatusChange({
      orgId: ctx.org.id,
      taskId: id,
      taskTitle: before.title,
      actorId: profile.id,
      assigneeId: before.assignee_id,
      createdBy: before.created_by,
      status,
      previousStatus: before.status,
    });
    revalidatePath(`/pm/tasks/${id}`);
  }

  async function handleAddComment(formData: FormData) {
    "use server";
    const profile = await requireProfile();
    const ctx = await requireOrgContext();
    const content = formData.get("content") as string;
    if (!content.trim()) return;
    const before = await getTask(id);
    await addTaskComment(id, profile.id, content);
    if (before) {
      await notifyTaskComment({
        orgId: ctx.org.id,
        taskId: id,
        taskTitle: before.title,
        actorId: profile.id,
        assigneeId: before.assignee_id,
        createdBy: before.created_by,
        content: content.trim(),
      });
    }
    revalidatePath(`/pm/tasks/${id}`);
  }

  async function handleDeleteComment(formData: FormData) {
    "use server";
    const commentId = formData.get("commentId") as string;
    await deleteTaskComment(commentId);
    revalidatePath(`/pm/tasks/${id}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            {task.project ? (
              <Link
                href={`/pm/projects/${task.project.id}`}
                className="text-xs bg-atlassian-purple-light text-atlassian-purple px-2 py-0.5 rounded-atlassian hover:bg-purple-200 font-semibold"
              >
                {task.project.name}
              </Link>
            ) : (
              <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-atlassian font-semibold">
                Private Task
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-neutral-1000">
            {task.title}
          </h1>
        </div>
        {(isCreator || isSuperAdmin) && (
          <Link
            href={`/pm/tasks/${id}/edit`}
            className="text-sm text-brand-700 hover:text-brand-800 hover:underline"
          >
            Edit
          </Link>
        )}
        <TaskWatchToggle taskId={id} initialWatching={isWatching} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-neutral-800 whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-neutral-700 italic">
                  No description provided.
                </p>
              )}
            </CardContent>
          </Card>

          <TaskAttachments task={task} orgId={ctx.org.id} canUpload={canEdit} />

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 bg-neutral-50 border border-neutral-200 rounded-atlassian"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold text-neutral-1000">
                          {comment.author?.username ?? "Unknown"}
                        </span>
                        <div className="flex items-center gap-3">
                          <time className="text-xs text-neutral-700 whitespace-nowrap">
                            {new Date(comment.created_at).toLocaleDateString()}{" "}
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                          {(comment.author_id === profile.id || isSuperAdmin) && (
                            <form action={handleDeleteComment}>
                              <input type="hidden" name="commentId" value={comment.id} />
                              <button
                                type="submit"
                                className="text-xs text-atlassian-red hover:underline font-medium"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-700 text-sm py-4 text-center">
                    No comments yet. Be the first to add one.
                  </p>
                )}

                <form action={handleAddComment} className="pt-4 border-t border-neutral-200">
                  <textarea
                    name="content"
                    rows={2}
                    placeholder="Add a comment..."
                    className="atlassian-input mb-2"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm">
                      Add Comment
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-neutral-700 text-xs font-semibold uppercase tracking-wide">Assignee:</span>
                <p className="font-medium text-neutral-1000 mt-0.5">
                  {task.assignee?.username ?? "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-neutral-700 text-xs font-semibold uppercase tracking-wide">Created by:</span>
                <p className="font-medium text-neutral-1000 mt-0.5">
                  {task.creator?.username ?? "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-neutral-700 text-xs font-semibold uppercase tracking-wide">Due date:</span>
                <p className="font-medium text-neutral-1000 mt-0.5">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <span className="text-neutral-700 text-xs font-semibold uppercase tracking-wide">Created:</span>
                <p className="font-medium text-neutral-1000 mt-0.5">
                  {new Date(task.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handleStatusUpdate} className="space-y-3">
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="atlassian-select"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <Button type="submit" className="w-full">
                    Update Status
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
