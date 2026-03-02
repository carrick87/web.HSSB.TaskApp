import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayAppDate } from "@/lib/date";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayAppDate();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [{ data: todayTasks }, { data: stats }, { data: pointsRows }] = await Promise.all([
    supabase
      .from("task_instances")
      .select("id, status, is_late")
      .eq("assignee_profile_id", user.id)
      .eq("assignment_date", today),
    supabase
      .from("task_user_stats")
      .select("total_completed, total_late_submissions, total_failed")
      .eq("profile_id", user.id)
      .single(),
    supabase
      .from("user_points")
      .select("points_earned")
      .eq("profile_id", user.id)
      .eq("month", month)
      .eq("year", year),
  ]);

  const tasksToday = todayTasks?.length ?? 0;
  const completedToday =
    todayTasks?.filter((t) => t.status === "verified").length ?? 0;
  const lateToday =
    todayTasks?.filter((t) => t.is_late && t.status === "verified").length ?? 0;
  const pointsThisMonth =
    pointsRows?.reduce((sum, r) => sum + (r.points_earned ?? 0), 0) ?? 0;

  return NextResponse.json({
    tasksToday,
    completedToday,
    lateToday,
    pointsThisMonth,
    totalCompleted: stats?.total_completed ?? 0,
    totalLateSubmissions: stats?.total_late_submissions ?? 0,
    totalFailed: stats?.total_failed ?? 0,
  });
}
