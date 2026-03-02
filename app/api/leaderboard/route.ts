import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();
  const branchId = searchParams.get("branch_id") || undefined;
  const departmentId = searchParams.get("department_id") || undefined;

  let query = supabase
    .from("user_points")
    .select("profile_id, points_earned");

  if (period === "month") {
    query = query.eq("month", month).eq("year", year);
  } else if (period === "year") {
    query = query.eq("year", year);
  }

  const { data: pointsRows } = await query;

  const byProfile: Record<string, number> = {};
  for (const row of pointsRows ?? []) {
    byProfile[row.profile_id] = (byProfile[row.profile_id] ?? 0) + (row.points_earned ?? 0);
  }

  let profileIds = Object.keys(byProfile);
  if (branchId || departmentId) {
    let filterQuery = supabase.from("profiles").select("id");
    if (branchId) filterQuery = filterQuery.eq("branch_id", branchId);
    if (departmentId) filterQuery = filterQuery.eq("department_id", departmentId);
    const { data: filtered } = await filterQuery;
    const allowed = new Set((filtered ?? []).map((p) => p.id));
    profileIds = profileIds.filter((id) => allowed.has(id));
  }

  const { data: stats } = await supabase
    .from("task_user_stats")
    .select("profile_id, total_completed, total_late_submissions, total_failed")
    .in("profile_id", profileIds);

  const statsMap: Record<string, { completed: number; late: number; failed: number }> = {};
  for (const s of stats ?? []) {
    statsMap[s.profile_id] = {
      completed: s.total_completed ?? 0,
      late: s.total_late_submissions ?? 0,
      failed: s.total_failed ?? 0,
    };
  }

  const sorted = profileIds
    .map((id) => ({
      profile_id: id,
      totalPoints: byProfile[id] ?? 0,
      ...statsMap[id],
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, branch:branches(name), department:departments(name)")
    .in("id", sorted.map((s) => s.profile_id));

  const profileMap: Record<string, { username: string; branch: string; department: string }> = {};
  const nameOf = (x: unknown): string =>
    Array.isArray(x) ? (x[0] as { name?: string })?.name ?? "" : (x as { name?: string })?.name ?? "";
  for (const p of profiles ?? []) {
    profileMap[p.id] = {
      username: p.username,
      branch: nameOf(p.branch),
      department: nameOf(p.department),
    };
  }

  const leaderboard = sorted.map((s, i) => ({
    rank: i + 1,
    profile_id: s.profile_id,
    name: profileMap[s.profile_id]?.username ?? "—",
    branch: profileMap[s.profile_id]?.branch ?? "",
    department: profileMap[s.profile_id]?.department ?? "",
    totalPoints: s.totalPoints,
    completed: s.completed ?? 0,
    late: s.late ?? 0,
    failed: s.failed ?? 0,
  }));

  return NextResponse.json({
    leaderboard,
    period,
    month: period === "month" ? month : undefined,
    year,
  });
}
