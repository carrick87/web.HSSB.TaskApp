export type DigestTaskInput = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

export type DigestTaskRow = {
  title: string;
  url: string;
  dueKind: "overdue" | "due_today" | "none";
  dueDateFormatted?: string;
  statusLabel: string;
  metaSuffix: string;
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function taskStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function shouldSkipDigest(openCount: number, overdueCount: number): boolean {
  return openCount === 0 && overdueCount === 0;
}

export function countDueToday(
  tasks: DigestTaskInput[],
  localDateStr: string
): number {
  return tasks.filter(
    (t) => t.due_date && String(t.due_date).slice(0, 10) === localDateStr
  ).length;
}

function dueSortKey(task: DigestTaskInput, localDateStr: string): number {
  if (!task.due_date) return 3;
  const due = String(task.due_date).slice(0, 10);
  if (due < localDateStr) return 0;
  if (due === localDateStr) return 1;
  return 2;
}

export function buildDigestTaskRows(
  tasks: DigestTaskInput[],
  localDateStr: string,
  taskUrlFn: (id: string) => string,
  formatDueDate: (dueIso: string) => string,
  limit = 20
): DigestTaskRow[] {
  const sorted = [...tasks].sort((a, b) => {
    const ka = dueSortKey(a, localDateStr);
    const kb = dueSortKey(b, localDateStr);
    if (ka !== kb) return ka - kb;
    const da = a.due_date ? String(a.due_date).slice(0, 10) : "9999";
    const db = b.due_date ? String(b.due_date).slice(0, 10) : "9999";
    return da.localeCompare(db);
  });

  return sorted.slice(0, limit).map((t) => {
    let dueKind: DigestTaskRow["dueKind"] = "none";
    let dueDateFormatted: string | undefined;
    if (t.due_date) {
      const due = String(t.due_date).slice(0, 10);
      if (due < localDateStr) {
        dueKind = "overdue";
        dueDateFormatted = formatDueDate(String(t.due_date));
      } else if (due === localDateStr) {
        dueKind = "due_today";
      }
    }
    return {
      title: t.title,
      url: taskUrlFn(t.id),
      dueKind,
      dueDateFormatted,
      statusLabel: taskStatusLabel(t.status),
      metaSuffix: "Assigned to you",
    };
  });
}

export function buildDigestPreheader(input: {
  dueTodayCount: number;
  overdueCount: number;
  summaryDateLabel: string;
}): string {
  const parts: string[] = [];
  if (input.dueTodayCount > 0) {
    parts.push(
      `${input.dueTodayCount} task${input.dueTodayCount === 1 ? "" : "s"} due today`
    );
  }
  if (input.overdueCount > 0) {
    parts.push(`${input.overdueCount} overdue`);
  }
  const stats = parts.length ? parts.join(", ") : "Your task summary";
  return `${stats} — here's your summary for ${input.summaryDateLabel}.`;
}
