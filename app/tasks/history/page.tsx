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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">
          Task History
        </h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Past completed and failed tasks
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tasks?.length ? (
            <div className="px-4 py-8 text-center">
              <p className="text-neutral-700 text-sm">
                No task history yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {tasks.map((t: { id: string; status: string; assignment_date: string; submitted_at: string | null; template: unknown }) => {
                const title = Array.isArray(t.template) ? (t.template[0] as { title?: string })?.title : (t.template as { title?: string })?.title;
                return (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-1000 text-sm">
                        {title ?? "Task"}
                      </p>
                      <p className="text-xs text-neutral-700 mt-0.5">
                        {new Date(t.assignment_date).toLocaleDateString()}
                        {t.submitted_at && ` · Submitted ${new Date(t.submitted_at).toLocaleString()}`}
                      </p>
                    </div>
                    <StatusBadge status={t.status as "verified" | "rejected" | "failed"} />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
