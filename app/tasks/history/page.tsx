import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getTodayAppDate } from "@/lib/date";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function TaskHistoryPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = getTodayAppDate();

  const { data: tasks } = await supabase
    .from("task_instances")
    .select(
      `
      id,
      status,
      due_date,
      assignment_date,
      submitted_at,
      verified_at,
      is_late,
      template:task_templates(id, title)
    `
    )
    .eq("assignee_profile_id", profile.id)
    .lt("assignment_date", today)
    .in("status", ["verified", "rejected", "failed"])
    .order("assignment_date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Task History
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Past completed / failed tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="text-slate-500 dark:text-slate-400">
              No history yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {tasks.map((t: { id: string; status: string; assignment_date: string; submitted_at: string | null; template: unknown }) => {
                const title = Array.isArray(t.template) ? (t.template[0] as { title?: string })?.title : (t.template as { title?: string })?.title;
                return (
                <li key={t.id} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {title ?? "Task"}
                      </Link>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(t.assignment_date).toLocaleDateString()}
                        {t.submitted_at && ` · Submitted ${new Date(t.submitted_at).toLocaleString()}`}
                      </p>
                    </div>
                    <StatusBadge status={t.status as "verified" | "rejected" | "failed"} />
                  </div>
                </li>
              );})}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
