import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, branch_id, department_id")
    .eq("id", user.id)
    .single();
  if (myProfile?.role !== "super_admin" && myProfile?.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const comment = typeof body.comment === "string" ? body.comment.trim() : null;

  const { data: task } = await supabase
    .from("task_instances")
    .select("id, status, assignee_profile_id")
    .eq("id", id)
    .single();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.status !== "submitted") {
    return NextResponse.json({ error: "Task is not submitted" }, { status: 400 });
  }

  if (myProfile.role === "manager") {
    const { data: assignee } = await supabase
      .from("profiles")
      .select("branch_id, department_id")
      .eq("id", task.assignee_profile_id)
      .single();
    const sameBranch = myProfile.branch_id && assignee?.branch_id === myProfile.branch_id;
    const sameDept = myProfile.department_id && assignee?.department_id === myProfile.department_id;
    if (!sameBranch && !sameDept) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error: updateError } = await supabase
    .from("task_instances")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      pic_comment: comment,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
