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
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: tasks, error } = await supabase
    .from("task_instances")
    .select(
      `
      id,
      status,
      due_date,
      is_late,
      assignment_date,
      created_at,
      template:task_templates(id, title, description)
    `
    )
    .eq("assignee_profile_id", user.id)
    .gte("assignment_date", today)
    .lte("assignment_date", today)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}
