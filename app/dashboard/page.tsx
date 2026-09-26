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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-700 mt-0.5">
            Welcome back, {profile.username}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Tasks Today
            </p>
            <p className="text-2xl font-bold text-neutral-1000 mt-1">
              {tasksRaw.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Completed
            </p>
            <p className="text-2xl font-bold text-atlassian-green mt-1">
              {stats?.total_completed ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Late
            </p>
            <p className="text-2xl font-bold text-atlassian-yellow mt-1">
              {stats?.total_late_submissions ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Points (Month)
            </p>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {pointsThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tasksRaw.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-neutral-700 text-sm">
                No tasks assigned for today.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {tasksRaw.map((task: { id: string; status: string; is_late: boolean; template: unknown }) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-1000 text-sm">
                      {titleOf(task.template) || "Task"}
                    </p>
                    {descOf(task.template) && (
                      <p className="text-sm text-neutral-700 truncate mt-0.5">
                        {descOf(task.template)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.is_late && (
                      <span className="inline-flex items-center rounded-atlassian px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-atlassian-yellow-light text-yellow-700">
                        Late
                      </span>
                    )}
                    <StatusBadge status={task.status as "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed"} />
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
