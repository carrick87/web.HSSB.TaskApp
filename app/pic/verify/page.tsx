import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

export default async function PicVerifyListPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("task_instances")
    .select(
      `
      id,
      status,
      submitted_at,
      due_date,
      is_late,
      template:task_templates(id, title),
      assignee:profiles!assignee_profile_id(username)
    `
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });

  if (profile.role === "pic") {
    const orFilters: string[] = [];
    if (profile.branch_id) orFilters.push(`branch_id.eq.${profile.branch_id}`);
    if (profile.department_id) orFilters.push(`department_id.eq.${profile.department_id}`);
    const { data: assignees } = await supabase
      .from("profiles")
      .select("id")
      .or(orFilters.length ? orFilters.join(",") : "id.eq.00000000-0000-0000-0000-000000000000");
    const ids = (assignees ?? []).map((a) => a.id);
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: tasks } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Pending Verification
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Submitted tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="text-slate-500 dark:text-slate-400">
              No tasks awaiting verification.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {tasks.map((t: { id: string; submitted_at: string; template: unknown; assignee: unknown }) => {
                const title = Array.isArray(t.template) ? (t.template[0] as { title?: string })?.title : (t.template as { title?: string })?.title;
                const username = Array.isArray(t.assignee) ? (t.assignee[0] as { username?: string })?.username : (t.assignee as { username?: string })?.username;
                return (
                <li key={t.id} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/pic/verify/${t.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {title ?? "Task"}
                      </Link>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {username ?? "—"} · Submitted{" "}
                        {new Date(t.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/pic/verify/${t.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Review
                    </Link>
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
