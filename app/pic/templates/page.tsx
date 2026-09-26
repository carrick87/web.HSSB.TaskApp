import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function PicTemplatesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("task_templates")
    .select("id, title, description, is_active, recurrence_type, created_at")
    .order("created_at", { ascending: false });
  if (profile.role === "manager") {
    query = query.eq("created_by_profile_id", profile.id);
  }
  const { data: templates } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-1000">
            Task manager
          </h1>
          <p className="text-sm text-neutral-700 mt-1">
            Create task templates and assign to users, branches, or departments. Tasks are generated daily from active templates.
          </p>
        </div>
        <Link
          href="/pic/templates/new"
          className="rounded-atlassian bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0"
        >
          New template
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All templates</CardTitle>
        </CardHeader>
        <CardContent>
          {!templates?.length ? (
            <p className="text-neutral-700">No templates yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {templates.map((t: { id: string; title: string; is_active: boolean; recurrence_type: string }) => (
                <li key={t.id} className="py-3 first:pt-0 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/pic/templates/${t.id}/edit`}
                      className="font-medium text-neutral-1000 hover:underline"
                    >
                      {t.title}
                    </Link>
                    <p className="text-sm text-neutral-700">
                      {t.is_active ? "Active" : "Inactive"} · {t.recurrence_type}
                    </p>
                  </div>
                  <Link
                    href={`/pic/templates/${t.id}/edit`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
