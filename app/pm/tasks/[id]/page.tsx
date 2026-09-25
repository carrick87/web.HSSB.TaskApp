import { requireProfile } from "@/lib/auth";
import { getTask, updateTask, addTaskComment, deleteTaskComment } from "@/lib/tasks-v2";
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
  
  const task = await getTask(id);
  if (!task) {
    notFound();
  }

  const isAssignee = task.assignee_id === profile.id;
  const isCreator = task.created_by === profile.id;
  const isAdmin = profile.role === "admin";
  const canEdit = isAssignee || isCreator || isAdmin;

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const status = formData.get("status") as "todo" | "in_progress" | "done";
    await updateTask(id, { status });
    revalidatePath(`/pm/tasks/${id}`);
  }

  async function handleAddComment(formData: FormData) {
    "use server";
    const profile = await requireProfile();
    const content = formData.get("content") as string;
    if (!content.trim()) return;
    await addTaskComment(id, profile.id, content);
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
                className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                {task.project.name}
              </Link>
            ) : (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                Private Task
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {task.title}
          </h1>
        </div>
        {(isCreator || isAdmin) && (
          <Link
            href={`/pm/tasks/${id}/edit`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 italic">
                  No description provided.
                </p>
              )}
            </CardContent>
          </Card>

          <TaskAttachments task={task} canUpload={canEdit} />

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
                      className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {comment.author?.username ?? "Unknown"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                          {(comment.author_id === profile.id || isAdmin) && (
                            <form action={handleDeleteComment}>
                              <input type="hidden" name="commentId" value={comment.id} />
                              <button
                                type="submit"
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    No comments yet.
                  </p>
                )}

                <form action={handleAddComment} className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <textarea
                    name="content"
                    rows={2}
                    placeholder="Add a comment..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 mb-2"
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
                <span className="text-slate-500 dark:text-slate-400">Assignee:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {task.assignee?.username ?? "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Created by:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {task.creator?.username ?? "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Due date:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Created:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
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
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
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
