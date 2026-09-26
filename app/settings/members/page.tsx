import { requireOrgAdmin } from "@/lib/org/context";
import { createClient } from "@/lib/supabase/server";
import { MembersClient } from "@/components/settings/MembersClient";

export default async function MembersSettingsPage() {
  const ctx = await requireOrgAdmin();
  const supabase = await createClient();

  const [membersRes, branchesRes, deptsRes, auditRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, role, status, branch_id, department_id")
      .eq("org_id", ctx.org.id),
    supabase.from("branches").select("id, name").eq("org_id", ctx.org.id).order("name"),
    supabase.from("departments").select("id, name, branch_id").eq("org_id", ctx.org.id).order("name"),
    supabase
      .from("organization_audit_log")
      .select("id, action, created_at, actor_id")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const userIds = (membersRes.data ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, harrison_email, auth_email, last_sign_in_at")
        .in("id", userIds)
    : { data: [] as never[] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const users = (membersRes.data ?? []).map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.user_id,
      username: p?.username ?? "—",
      harrison_email: p?.harrison_email ?? null,
      auth_email: p?.auth_email ?? "",
      role: m.role,
      status: m.status,
      last_sign_in_at: p?.last_sign_in_at ?? null,
      branch_id: m.branch_id,
      department_id: m.department_id,
    };
  });

  return (
    <MembersClient
      initialUsers={users}
      branches={branchesRes.data ?? []}
      departments={deptsRes.data ?? []}
      auditLogs={auditRes.error ? [] : auditRes.data ?? []}
      currentUserId={ctx.profile.id}
    />
  );
}
