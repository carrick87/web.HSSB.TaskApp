import { requireProfile } from "@/lib/auth";
import { getMyTasks } from "@/lib/tasks-v2";
import Link from "next/link";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/pm/TaskBadges";
import { EmptyState } from "@/components/ui/EmptyState";

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
    description: string | null;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    project?: { name: string } | null;
  }>;
  bgColor: string;
}) {
  return (
    <div className="flex flex-col min-w-[280px] lg:min-w-0 lg:flex-1">
      <div className={`px-3 py-2 rounded-t-atlassian ${bgColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide">{title}</span>
          <span className="bg-white/80 text-neutral-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 bg-neutral-100 p-2 rounded-b-atlassian space-y-2 min-h-[200px]">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/pm/tasks/${task.id}`}
            className="block bg-white rounded-atlassian shadow-atlassian-sm p-3 hover:bg-neutral-50 transition-colors border border-neutral-200"
          >
            <p className="font-medium text-sm text-neutral-1000 line-clamp-2">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-neutral-700 mt-1.5 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {task.project ? (
                  <span className="inline-flex items-center rounded-atlassian px-1.5 py-0.5 text-xs font-semibold bg-atlassian-purple-light text-atlassian-purple">
                    {task.project.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-atlassian px-1.5 py-0.5 text-xs font-semibold bg-neutral-200 text-neutral-700">
                    Private
                  </span>
                )}
              </div>
              <TaskPriorityBadge priority={task.priority} />
            </div>
            {task.due_date && (
              <p className="text-xs text-neutral-700 mt-2 font-medium">
                Due: {new Date(task.due_date).toLocaleDateString()}
              </p>
            )}
          </Link>
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-neutral-700">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

export default async function MyTasksPage() {
  const profile = await requireProfile();
  const tasks = await getMyTasks(profile.id);

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-neutral-1000">My Tasks</h1>
        <EmptyState
          title="Create your first task"
          description="This workspace is ready. Add a task to track work, due dates, and attachments."
          actionLabel="Create your first task"
          actionHref="/pm/tasks/new"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">My Tasks</h1>
          <p className="text-sm text-neutral-700 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
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
    </div>
  );
}
