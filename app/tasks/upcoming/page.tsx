import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getTodayAppDate } from "@/lib/date";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function UpcomingTasksPage() {
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
      is_late,
      template:task_templates(id, title, description)
    `
    )
    .eq("assignee_profile_id", profile.id)
    .gt("assignment_date", today)
    .order("assignment_date", { ascending: true })
    .limit(50);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">
          Upcoming Tasks
        </h1>
        <p className="text-sm text-neutral-700 mt-0.5">
          Tasks scheduled for future dates
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Future Assignments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tasks?.length ? (
            <div className="px-4 py-8 text-center">
              <p className="text-neutral-700 text-sm">
                No upcoming tasks scheduled.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {tasks.map((t: { id: string; status: string; assignment_date: string; due_date: string; template: unknown }) => {
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
                        Due {new Date(t.due_date).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={t.status as "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed"} />
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
