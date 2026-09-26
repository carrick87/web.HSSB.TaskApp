import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTasksForToday } from "@/lib/tasks";
import { getActiveOrgIdForUser } from "@/lib/org/active-org";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin" && profile?.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    title,
    description,
    recurrence_type,
    recurrence_value,
    start_date,
    end_date,
    is_active,
    requires_verification,
    assign_to_type,
    assign_to_id,
    created_by_profile_id,
    questions,
  } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
  }

  const orgId = await getActiveOrgIdForUser(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const { data: template, error: templateError } = await supabase
    .from("task_templates")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      recurrence_type: recurrence_type ?? "daily",
      recurrence_value: recurrence_value ?? null,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: is_active !== false,
      requires_verification: requires_verification !== false,
      assign_to_type: assign_to_type ?? "user",
      assign_to_id: assign_to_id || null,
      created_by_profile_id: created_by_profile_id || user.id,
      org_id: orgId,
    })
    .select("id")
    .single();

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 500 });
  }

  const questionRows = questions.map((q: { question_text: string; answer_type: string; is_required?: boolean; options_json?: string[] | null; sort_order?: number }, i: number) => ({
    template_id: template.id,
    question_text: q.question_text?.trim() ?? "",
    answer_type: q.answer_type ?? "text",
    is_required: q.is_required !== false,
    options_json: q.options_json ?? null,
    sort_order: q.sort_order ?? i,
  }));

  const { error: questionsError } = await supabase
    .from("task_template_questions")
    .insert(questionRows);

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  // Whenever a task template is created, generate today's task instances so assignees see them instantly.
  // Cron continues to run for recurring tasks on future days.
  await generateTasksForToday(
    template.id,
    assign_to_type ?? "user",
    assign_to_id || null,
    is_active !== false,
    start_date || null,
    end_date || null
  );

  return NextResponse.json({ id: template.id });
}
