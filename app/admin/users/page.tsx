import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, harrison_email, role, branch:branches(name), department:departments(name)")
    .order("username");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-1000">
          Users
        </h1>
        <Link
          href="/admin/users/new"
          className="rounded-atlassian bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          New user
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 font-medium">Username</th>
                  <th className="text-left py-2 font-medium">Email</th>
                  <th className="text-left py-2 font-medium">Role</th>
                  <th className="text-left py-2 font-medium">Branch</th>
                  <th className="text-left py-2 font-medium">Department</th>
                  <th className="text-left py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u: { id: string; username: string; harrison_email: string | null; role: string; branch: unknown; department: unknown }) => (
                  <tr key={u.id} className="border-b border-neutral-200">
                    <td className="py-2">{u.username}</td>
                    <td className="py-2">{u.harrison_email ?? "—"}</td>
                    <td className="py-2"><Badge className="bg-neutral-200">{u.role}</Badge></td>
                    <td className="py-2">{Array.isArray(u.branch) ? (u.branch[0] as { name?: string })?.name : (u.branch as { name?: string })?.name ?? "—"}</td>
                    <td className="py-2">{Array.isArray(u.department) ? (u.department[0] as { name?: string })?.name : (u.department as { name?: string })?.name ?? "—"}</td>
                    <td className="py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-brand-700 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
