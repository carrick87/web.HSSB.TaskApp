import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [
    { count: userCount },
    { count: branchCount },
    { count: deptCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Admin
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Manage users, branches, departments, and point settings.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">User management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{userCount ?? 0}</p>
              <p className="text-sm text-slate-500">users</p>
              <p className="text-sm text-slate-500 mt-1">Edit details, assign branch/department, role, reset password</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/branches">
          <Card className="hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{branchCount ?? 0}</p>
              <p className="text-sm text-slate-500">branches</p>
              <p className="text-sm text-slate-500 mt-1">Add, edit, delete branches</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/departments">
          <Card className="hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{deptCount ?? 0}</p>
              <p className="text-sm text-slate-500">departments</p>
              <p className="text-sm text-slate-500 mt-1">Add, edit, delete departments by branch</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/points">
          <Card className="hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Point settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Event point values</p>
              <p className="text-sm text-slate-500 mt-1">Configure points for completed, late, failed, etc.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
