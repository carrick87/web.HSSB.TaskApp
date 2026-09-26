import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
import { createClient } from "@/lib/supabase/server";
import { UserManagementClient } from "@/components/admin/UserManagementClient";

export default async function AdminUsersPage() {
  const profile = await requireSuperAdmin();
  const supabase = await createClient();

  const [usersRes, branchesRes, deptsRes, auditRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, harrison_email, auth_email, role, status, last_sign_in_at, branch_id, department_id, branch:branches(name), department:departments(name)"
        )
        .order("username"),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("departments").select("id, name, branch_id").order("name"),
      supabase
        .from("admin_audit_log")
        .select("id, action, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const users = usersRes.data;
  const branches = branchesRes.data;
  const departments = deptsRes.data;
  const auditLogs = auditRes.error ? [] : auditRes.data;

  return (
    <UserManagementClient
      initialUsers={(users ?? []) as never[]}
      branches={branches ?? []}
      departments={departments ?? []}
      auditLogs={auditLogs ?? []}
      currentUserId={profile.id}
    />
  );
}
