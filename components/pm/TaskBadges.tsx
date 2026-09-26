import type { TaskStatus2, TaskPriority } from "@/types/database.types";

const statusClasses: Record<TaskStatus2, string> = {
  todo: "bg-neutral-200 text-neutral-700",
  in_progress: "bg-brand-50 text-brand-800",
  done: "bg-atlassian-green-light text-green-700",
};

const statusLabels: Record<TaskStatus2, string> = {
  todo: "TO DO",
  in_progress: "IN PROGRESS",
  done: "DONE",
};

export function TaskStatusBadge({ status }: { status: TaskStatus2 }) {
  return (
    <span
      className={`inline-flex items-center rounded-atlassian px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-atlassian-green-light text-green-700 border border-green-200",
  medium: "bg-atlassian-yellow-light text-yellow-700 border border-yellow-200",
  high: "bg-atlassian-red-light text-red-700 border border-red-200",
};

const priorityIcons: Record<TaskPriority, string> = {
  low: "↓",
  medium: "→",
  high: "↑",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-atlassian text-[11px] font-semibold ${priorityClasses[priority]}`}
      title={`${priorityLabels[priority]} priority`}
    >
      <span className="font-bold">{priorityIcons[priority]}</span>
      <span>{priorityLabels[priority]}</span>
    </span>
  );
}
