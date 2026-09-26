import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";
import { managerCanAccessAssignee } from "@/lib/tasks/manager-assignee-scope";
import { buildTaskInstancesSheet, sheetToBuffer } from "@/lib/excel";

export async function GET(request: Request) {
  const orgCtx = await getOrgApiContext(false, true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id") || undefined;
  const departmentId = searchParams.get("department_id") || undefined;
  const startDate = searchParams.get("start_date") || undefined;
  const endDate = searchParams.get("end_date") || undefined;

  let query = supabase
    .from("task_instances")
    .select(
      `
      id,
      assignee_profile_id,
      assignment_date,
      due_date,
      status,
      submitted_at,
      is_late,
      pic_comment,
      template:task_templates(title),
      assignee:profiles!assignee_profile_id(username, branch:branches(name), department:departments(name))
    `
    )
    .order("assignment_date", { ascending: false })
    .limit(5000);

  if (orgCtx.role === ORG_ROLES.MANAGER) {
    const orFilters: string[] = [];
    if (orgCtx.branchId) orFilters.push(`branch_id.eq.${orgCtx.branchId}`);
    if (orgCtx.departmentId) orFilters.push(`department_id.eq.${orgCtx.departmentId}`);
    const { data: assignees } = await supabase
      .from("profiles")
      .select("id")
      .or(orFilters.length ? orFilters.join(",") : "id.eq.00000000-0000-0000-0000-000000000000");
    const ids = (assignees ?? []).map((a) => a.id);
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", "00000000-0000-0000-0000-000000000000");
  }
  if (branchId) {
    const { data: branchProfiles } = await supabase.from("profiles").select("id").eq("branch_id", branchId);
    const ids = (branchProfiles ?? []).map((p) => p.id);
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", "00000000-0000-0000-0000-000000000000");
  }
  if (departmentId) {
    const { data: deptProfiles } = await supabase.from("profiles").select("id").eq("department_id", departmentId);
    const ids = (deptProfiles ?? []).map((p) => p.id);
    if (ids.length) query = query.in("assignee_profile_id", ids);
    else query = query.eq("assignee_profile_id", "00000000-0000-0000-0000-000000000000");
  }
  if (startDate) query = query.gte("assignment_date", startDate);
  if (endDate) query = query.lte("assignment_date", endDate);

  const { data: tasks } = await query;

  const assigneeProfileIds = Array.from(new Set((tasks ?? []).map((t: { assignee_profile_id?: string }) => t.assignee_profile_id).filter(Boolean))) as string[];
  const branchDeptByProfile: Record<string, { branch: string; department: string }> = {};
  const nameOf = (x: unknown): string =>
    Array.isArray(x) ? (x[0] as { name?: string })?.name ?? "" : (x as { name?: string })?.name ?? "";
  if (assigneeProfileIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, branch:branches(name), department:departments(name)")
      .in("id", assigneeProfileIds);
    for (const p of profiles ?? []) {
      branchDeptByProfile[p.id] = {
        branch: nameOf(p.branch),
        department: nameOf(p.department),
      };
    }
  }

  const titleOf = (x: unknown): string =>
    Array.isArray(x) ? (x[0] as { title?: string })?.title ?? "" : (x as { title?: string })?.title ?? "";
  const usernameOf = (x: unknown): string =>
    Array.isArray(x) ? (x[0] as { username?: string })?.username ?? "" : (x as { username?: string })?.username ?? "";
  const rows = (tasks ?? []).map((t: {
    template: unknown;
    assignee: unknown;
    assignee_profile_id: string;
    assignment_date: string;
    due_date: string;
    status: string;
    submitted_at: string | null;
    is_late: boolean;
    pic_comment: string | null;
  }) => {
    const assigneeId = t.assignee_profile_id;
    const bd = assigneeId ? branchDeptByProfile[assigneeId] : { branch: "", department: "" };
    return {
      taskName: titleOf(t.template),
      assignee: usernameOf(t.assignee),
      branch: bd?.branch ?? "",
      department: bd?.department ?? "",
      assignmentDate: t.assignment_date,
      dueDate: t.due_date,
      status: t.status,
      submittedAt: t.submitted_at,
      isLate: t.is_late,
      picComment: t.pic_comment,
    };
  });

  const ws = buildTaskInstancesSheet(rows);
  const buffer = sheetToBuffer(ws, "Tasks");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="task-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
