import { createClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/lib/org/context";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export default async function NotificationsPage() {
  const ctx = await requireOrgContext();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link_path, read_at, created_at")
    .eq("org_id", ctx.org.id)
    .eq("user_id", ctx.profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = notifications ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="When someone assigns you a task or mentions you, alerts will show up here."
          actionLabel="Go to tasks"
          actionHref="/pm"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className="rounded-atlassian border p-4"
              style={{ backgroundColor: "var(--neutral-surface)", borderColor: "var(--neutral-border)" }}
            >
              {n.link_path ? (
                <Link href={n.link_path} className="font-medium text-brand-700 hover:underline">
                  {n.title}
                </Link>
              ) : (
                <p className="font-medium">{n.title}</p>
              )}
              {n.body && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{n.body}</p>}
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {new Date(n.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
