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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-1000">
          My Profile
        </h1>
        <p className="text-sm text-neutral-600 mt-0.5">
          View your account details and performance
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Username</p>
                <p className="text-sm text-neutral-1000">{profile.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Email</p>
                <p className="text-sm text-neutral-1000">{profile.harrison_email ?? "Not set"}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Role</p>
                  <p className="text-sm text-neutral-1000 capitalize">{profile.role}</p>
                </div>
                {profile.branch && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Branch</p>
                    <p className="text-sm text-neutral-1000">{Array.isArray(profile.branch) ? (profile.branch[0] as { name?: string })?.name : (profile.branch as { name?: string })?.name}</p>
                  </div>
                )}
                {profile.department && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Department</p>
                    <p className="text-sm text-neutral-1000">{Array.isArray(profile.department) ? (profile.department[0] as { name?: string })?.name : (profile.department as { name?: string })?.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-50 rounded-atlassian p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-atlassian-green mt-1">{stats?.total_completed ?? 0}</p>
            </div>
            <div className="bg-neutral-50 rounded-atlassian p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Late</p>
              <p className="text-2xl font-bold text-atlassian-yellow mt-1">{stats?.total_late_submissions ?? 0}</p>
            </div>
            <div className="bg-neutral-50 rounded-atlassian p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Failed</p>
              <p className="text-2xl font-bold text-atlassian-red mt-1">{stats?.total_failed ?? 0}</p>
            </div>
            <div className="bg-brand-50 rounded-atlassian p-4">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Points (Month)</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">{pointsThisMonth}</p>
            </div>
            <div className="bg-brand-50 rounded-atlassian p-4 sm:col-span-2">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Total Points</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">{totalPoints}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
