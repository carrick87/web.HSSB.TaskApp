import { requireProfile } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { getProjectTasks } from "@/lib/tasks-v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/pm/TaskBadges";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  
  const project = await getProject(id);
  if (!project) {
    notFound();
  }

  const tasks = await getProjectTasks(id);

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {project.name}
          </h2>
          {project.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {project.description}
            </p>
          )}
        </div>
        <Link
          href={`/pm/tasks/new?project=${id}`}
          className="rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Add Task
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            {project.members && project.members.length > 0 ? (
              <ul className="space-y-2">
                {project.members.map((m) => (
                  <li key={m.profile_id} className="flex items-center gap-2 text-sm">
                    <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium">
                      {m.profile?.username?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {m.profile?.username ?? "Unknown"}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      ({m.profile?.role})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No members yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-600">{todoTasks.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">To Do</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{doneTasks.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">
              No tasks in this project yet.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/pm/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>Assigned to: {task.assignee?.username ?? "Unknown"}</span>
                      {task.due_date && (
                        <span>• Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
