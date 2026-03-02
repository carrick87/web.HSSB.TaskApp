import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: stats } = await supabase
    .from("task_user_stats")
    .select("total_completed, total_late_submissions, total_failed")
    .eq("profile_id", profile.id)
    .single();

  const now = new Date();
  const { data: pointsRows } = await supabase
    .from("user_points")
    .select("points_earned")
    .eq("profile_id", profile.id)
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear());

  const pointsThisMonth = (pointsRows ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0);

  const { data: allPoints } = await supabase
    .from("user_points")
    .select("points_earned")
    .eq("profile_id", profile.id);
  const totalPoints = (allPoints ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        My Profile
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="text-slate-500 dark:text-slate-400">Username:</span> {profile.username}</p>
          <p><span className="text-slate-500 dark:text-slate-400">Email (for recording):</span> {profile.harrison_email ?? "—"}</p>
          <p><span className="text-slate-500 dark:text-slate-400">Role:</span> {profile.role}</p>
          {profile.branch && <p><span className="text-slate-500 dark:text-slate-400">Branch:</span> {Array.isArray(profile.branch) ? (profile.branch[0] as { name?: string })?.name : (profile.branch as { name?: string })?.name}</p>}
          {profile.department && <p><span className="text-slate-500 dark:text-slate-400">Department:</span> {Array.isArray(profile.department) ? (profile.department[0] as { name?: string })?.name : (profile.department as { name?: string })?.name}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tasks completed</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.total_completed ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Late submissions</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.total_late_submissions ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Failed</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.total_failed ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Points this month</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pointsThisMonth}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total points (all time)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPoints}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
