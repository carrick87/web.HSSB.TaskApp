import type { TaskStatus2, TaskPriority } from "@/types/database.types";

const statusClasses: Record<TaskStatus2, string> = {
  todo: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const statusLabels: Record<TaskStatus2, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function TaskStatusBadge({ status }: { status: TaskStatus2 }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClasses[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
