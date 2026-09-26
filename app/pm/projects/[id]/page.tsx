import { requireProfile } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { getProjectTasks } from "@/lib/tasks-v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskPriorityBadge } from "@/components/pm/TaskBadges";
import Link from "next/link";
import { notFound } from "next/navigation";

function KanbanColumn({
  title,
  count,
  tasks,
  bgColor,
}: {
  title: string;
  count: number;
  tasks: Array<{
    id: string;
    title: string;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    assignee?: { username: string } | null;
  }>;
  bgColor: string;
}) {
  return (
    <div className="flex flex-col min-w-[260px] lg:min-w-0 lg:flex-1">
      <div className={`px-3 py-2 rounded-t-atlassian ${bgColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide">{title}</span>
          <span className="bg-white/80 text-neutral-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 bg-neutral-100 p-2 rounded-b-atlassian space-y-2 min-h-[150px]">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/pm/tasks/${task.id}`}
            className="block bg-white rounded-atlassian shadow-atlassian-sm p-3 hover:bg-neutral-50 transition-colors border border-neutral-200"
          >
            <p className="font-medium text-sm text-neutral-1000 line-clamp-2">
              {task.title}
            </p>
            <div className="flex items-center justify-between mt-2.5 gap-2">
              {task.assignee && (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                    {task.assignee.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-neutral-600">{task.assignee.username}</span>
                </div>
              )}
              <TaskPriorityBadge priority={task.priority} />
            </div>
            {task.due_date && (
              <p className="text-xs text-neutral-600 mt-2 font-medium">
                Due: {new Date(task.due_date).toLocaleDateString()}
              </p>
            )}
          </Link>
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-sm text-neutral-600">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-atlassian flex items-center justify-center shrink-0">
            <span className="font-bold text-lg">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-1000">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-neutral-600 mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/pm/tasks/new?project=${id}`}
          className="inline-flex items-center justify-center h-9 px-4 rounded-atlassian bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shadow-atlassian-sm shrink-0"
        >
          Add Task
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Board</CardTitle>
            <span className="text-xs text-neutral-500">{tasks.length} tasks</span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 lg:mx-0 lg:px-0">
              <KanbanColumn
                title="To Do"
                count={todoTasks.length}
                tasks={todoTasks}
                bgColor="bg-neutral-200 text-neutral-700"
              />
              <KanbanColumn
                title="In Progress"
                count={inProgressTasks.length}
                tasks={inProgressTasks}
                bgColor="bg-brand-100 text-brand-800"
              />
              <KanbanColumn
                title="Done"
                count={doneTasks.length}
                tasks={doneTasks}
                bgColor="bg-atlassian-green-light text-green-700"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            {project.members && project.members.length > 0 ? (
              <div className="space-y-3">
                {project.members.map((m) => (
                  <div key={m.profile_id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                      {m.profile?.username?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-1000 truncate">
                        {m.profile?.username ?? "Unknown"}
                      </p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {m.profile?.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">
                No team members yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
