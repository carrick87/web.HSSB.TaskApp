import { requireRole } from "@/lib/auth";
import { getTeamTasks } from "@/lib/tasks-v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/pm/TaskBadges";

export default async function TeamTasksPage() {
  const profile = await requireRole(["admin", "pic"]);
  
  if (!profile.department_id && profile.role !== "admin") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            You are not assigned to a department. Please contact an admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tasks = profile.role === "admin" 
    ? await getTeamTasks("") 
    : await getTeamTasks(profile.department_id!);

  const groupedByAssignee = tasks.reduce((acc, task) => {
    const assigneeId = task.assignee_id;
    const assigneeName = task.assignee?.username ?? "Unknown";
    if (!acc[assigneeId]) {
      acc[assigneeId] = { name: assigneeName, tasks: [] };
    }
    acc[assigneeId].tasks.push(task);
    return acc;
  }, {} as Record<string, { name: string; tasks: typeof tasks }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Team Tasks
        </h2>
        <Link
          href="/pm/tasks/new"
          className="rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Assign New Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No tasks in your team yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAssignee).map(([assigneeId, { name, tasks: assigneeTasks }]) => (
            <Card key={assigneeId}>
              <CardHeader>
                <CardTitle className="text-base">
                  {name}
                  <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({assigneeTasks.length} tasks)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assigneeTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/pm/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            {task.project ? (
                              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                {task.project.name}
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                                Private
                              </span>
                            )}
                            {task.due_date && (
                              <span className="text-slate-500 dark:text-slate-400">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <TaskPriorityBadge priority={task.priority} />
                        <TaskStatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
