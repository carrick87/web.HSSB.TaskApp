import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";
import { managerCanAccessAssignee } from "@/lib/tasks/manager-assignee-scope";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgCtx = await getOrgApiContext(false, true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();

  const { data: task } = await supabase
    .from("task_instances")
    .select("id, status, assignee_profile_id")
    .eq("id", id)
    .single();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.status !== "submitted") {
    return NextResponse.json({ error: "Task is not submitted" }, { status: 400 });
  }

  if (orgCtx.role === ORG_ROLES.MANAGER) {
    const ok = await managerCanAccessAssignee(
      supabase,
      task.assignee_profile_id,
      orgCtx.branchId,
      orgCtx.departmentId
    );
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error: updateError } = await supabase
    .from("task_instances")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
