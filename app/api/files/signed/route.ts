import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parts = path.split("/");
  const firstSegment = parts[0];
  if (firstSegment !== user.id) {
    const taskId = parts[1];
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role, branch_id, department_id")
      .eq("id", user.id)
      .single();
    if (myProfile?.role === "super_admin") {
      // allow
    } else if (myProfile?.role === "manager" && taskId) {
      const { data: task } = await supabase
        .from("task_instances")
        .select("assignee_profile_id")
        .eq("id", taskId)
        .single();
      if (task?.assignee_profile_id) {
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
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Use admin client so storage RLS doesn't block PIC/admin viewing assignee files
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.storage
    .from("task-files")
    .createSignedUrl(path, 3600);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const redirect = new URL(request.url).searchParams.get("redirect");
  if (redirect === "1") {
    return NextResponse.redirect(data.signedUrl);
  }
  return NextResponse.json({ url: data.signedUrl });
}
