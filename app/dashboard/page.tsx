import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ensureTasksForToday } from "@/lib/tasks";
import { getTodayAppDate } from "@/lib/date";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = getTodayAppDate();
  await ensureTasksForToday();

  const [tasksRes, statsRes, pointsRes] = await Promise.all([
    supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        due_date,
        is_late,
        assignment_date,
        template:task_templates(id, title, description)
      `
      )
      .eq("assignee_profile_id", profile.id)
      .eq("assignment_date", today)
      .order("due_date", { ascending: true }),
    supabase
      .from("task_user_stats")
      .select("total_completed, total_late_submissions, total_failed")
      .eq("profile_id", profile.id)
      .single(),
    supabase
      .from("user_points")
      .select("points_earned")
      .eq("profile_id", profile.id)
      .eq("month", new Date().getMonth() + 1)
      .eq("year", new Date().getFullYear()),
  ]);

  const tasksRaw = tasksRes.data ?? [];
  const titleOf = (t: unknown): string =>
    Array.isArray(t) ? (t[0] as { title?: string })?.title ?? "" : (t as { title?: string })?.title ?? "";
  const descOf = (t: unknown): string | null =>
    Array.isArray(t) ? (t[0] as { description?: string })?.description ?? null : (t as { description?: string })?.description ?? null;
  const stats = statsRes.data;
  const pointsThisMonth =
    (pointsRes.data ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Today&apos;s Tasks
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tasks Today
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {tasksRaw.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Completed
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_completed ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Late Submissions
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_late_submissions ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              My Points This Month
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {pointsThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks for today</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksRaw.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No tasks assigned for today.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {tasksRaw.map((task: { id: string; status: string; is_late: boolean; template: unknown }) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {titleOf(task.template) || "Task"}
                      </Link>
                      {descOf(task.template) && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {descOf(task.template)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.is_late && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Late
                        </span>
                      )}
                      <StatusBadge status={task.status as "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed"} />
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
