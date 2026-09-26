import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getTodayAppDate } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default async function PicDashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = getTodayAppDate();

  const branchId = profile.branch_id ?? undefined;
  const deptId = profile.department_id ?? undefined;

  const baseQuery = supabase
    .from("task_instances")
    .select("id, status, is_late, assignee_profile_id", { count: "exact" });

  let query = baseQuery;
  if (profile.role === "pic") {
    const orFilters: string[] = [];
    if (branchId) orFilters.push(`branch_id.eq.${branchId}`);
    if (deptId) orFilters.push(`department_id.eq.${deptId}`);
    const { data: assignees } = await supabase
      .from("profiles")
      .select("id")
      .or(orFilters.length ? orFilters.join(",") : "id.eq.00000000-0000-0000-0000-000000000000");
    const ids = (assignees ?? []).map((a) => a.id);
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", "00000000-0000-0000-0000-000000000000");
  }

  const [pendingRes, verifiedTodayRes, lateRes, allRes] = await Promise.all([
    query.eq("status", "submitted").then((r) => r),
    profile.role === "admin"
      ? supabase.from("task_instances").select("id", { count: "exact", head: true }).eq("status", "verified").gte("verified_at", `${today}T00:00:00`)
      : query.eq("status", "verified").gte("verified_at", `${today}T00:00:00`).then((r) => ({ count: r.data?.length ?? 0 })),
    profile.role === "admin"
      ? supabase.from("task_instances").select("id", { count: "exact", head: true }).eq("is_late", true).eq("assignment_date", today)
      : query.eq("is_late", true).eq("assignment_date", today).then((r) => ({ count: r.data?.length ?? 0 })),
    profile.role === "admin"
      ? supabase.from("task_instances").select("id, status", { count: "exact" })
      : query.select("id, status"),
  ]);

  const pendingVerification = pendingRes.data?.length ?? (pendingRes as { count?: number }).count ?? 0;
  const verifiedToday = verifiedTodayRes.count ?? (verifiedTodayRes as { data?: unknown[] }).data?.length ?? 0;
  const lateToday = lateRes.count ?? (lateRes as { data?: unknown[] }).data?.length ?? 0;

  const allData = allRes.data ?? [];
  const total = (allRes as { count?: number }).count ?? allData.length;
  const completed = allData.filter((t: { status: string }) => t.status === "verified").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-1000">
        PIC Dashboard
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-neutral-700">Pending Verification</p>
            <p className="text-2xl font-bold text-neutral-1000">
              {pendingVerification}
            </p>
            <Link href="/pic/verify" className="text-sm text-brand-700 hover:underline mt-1 inline-block">
              Review →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-neutral-700">Verified Today</p>
            <p className="text-2xl font-bold text-neutral-1000">{verifiedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-neutral-700">Late Submissions Today</p>
            <p className="text-2xl font-bold text-neutral-1000">{lateToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-neutral-700">Overall Completion Rate</p>
            <p className="text-2xl font-bold text-neutral-1000">{completionRate}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
