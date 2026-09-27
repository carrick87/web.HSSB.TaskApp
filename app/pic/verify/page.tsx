import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ORG_ROLES } from "@/lib/org/roles";
import { listUserIdsInManagerScope, EMPTY_ASSIGNEE_SENTINEL } from "@/lib/org/manager-scope";

export default async function PicVerifyListPage() {
  const { org, membership } = await requireOrgContext();
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

  if (membership.role === ORG_ROLES.MANAGER) {
    const ids = await listUserIdsInManagerScope(
      supabase,
      org.id,
      membership.branch_id,
      membership.department_id
    );
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", EMPTY_ASSIGNEE_SENTINEL);
  }

  const { data: tasks } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-1000">
        Pending Verification
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Submitted tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="text-neutral-700">
              No tasks awaiting verification.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {tasks.map((t: { id: string; submitted_at: string; template: unknown; assignee: unknown }) => {
                const title = Array.isArray(t.template) ? (t.template[0] as { title?: string })?.title : (t.template as { title?: string })?.title;
                const username = Array.isArray(t.assignee) ? (t.assignee[0] as { username?: string })?.username : (t.assignee as { username?: string })?.username;
                return (
                <li key={t.id} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/pic/verify/${t.id}`}
                        className="font-medium text-neutral-1000 hover:underline"
                      >
                        {title ?? "Task"}
                      </Link>
                      <p className="text-sm text-neutral-700">
                        {username ?? "—"} · Submitted{" "}
                        {new Date(t.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/pic/verify/${t.id}`}
                      className="text-sm font-medium text-brand-700 hover:underline"
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
