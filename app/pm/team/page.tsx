import { requireOrgManagerOrAbove } from "@/lib/auth";
import { isOrgAdminRole, ORG_ROLES } from "@/lib/org/roles";
import { getTeamTasks } from "@/lib/tasks-v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/pm/TaskBadges";

export default async function TeamTasksPage() {
  const ctx = await requireOrgManagerOrAbove();
  const { profile, membership } = ctx;
  
  if (!membership.department_id && !profile.department_id && !isOrgAdminRole(membership.role)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 bg-atlassian-yellow-light rounded-atlassian flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-atlassian-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-neutral-700 text-sm">
            You are not assigned to a department. Please contact an admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const deptId = membership.department_id ?? profile.department_id;
  const tasks = isOrgAdminRole(membership.role)
    ? await getTeamTasks("") 
    : await getTeamTasks(deptId!);

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
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">Team Tasks</h1>
          <p className="text-sm text-neutral-700 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across {Object.keys(groupedByAssignee).length} team member{Object.keys(groupedByAssignee).length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/pm/tasks/new"
          className="inline-flex items-center justify-center h-9 px-4 rounded-atlassian bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shadow-atlassian-sm"
        >
          Assign Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 bg-neutral-100 rounded-atlassian flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-neutral-700 text-sm">
              No tasks in your team yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByAssignee).map(([assigneeId, { name, tasks: assigneeTasks }]) => (
            <Card key={assigneeId}>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle>{name}</CardTitle>
                  <p className="text-xs text-neutral-700 mt-0.5">
                    {assigneeTasks.length} task{assigneeTasks.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-100">
                  {assigneeTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/pm/tasks/${task.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-neutral-1000 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.project ? (
                            <span className="inline-flex items-center rounded-atlassian px-1.5 py-0.5 text-[10px] font-semibold bg-atlassian-purple-light text-atlassian-purple">
                              {task.project.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-atlassian px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-200 text-neutral-700">
                              Private
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-neutral-700">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
