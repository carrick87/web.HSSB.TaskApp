import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";
import { generateTasksForToday } from "@/lib/tasks";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgCtx = await getOrgApiContext();
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage =
    orgCtx.role === ORG_ROLES.OWNER ||
    orgCtx.role === ORG_ROLES.ADMIN ||
    orgCtx.role === ORG_ROLES.MANAGER;
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await supabase
    .from("task_templates")
    .select("id, created_by_profile_id, org_id")
    .eq("id", id)
    .single();
  if (!existing.data || existing.data.org_id !== orgCtx.orgId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (
    orgCtx.role === ORG_ROLES.MANAGER &&
    existing.data.created_by_profile_id !== user.id
  ) {
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
    questions,
  } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("task_templates")
    .update({
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
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  type QuestionInput = {
    id?: string;
    question_text: string;
    answer_type: string;
    is_required?: boolean;
    options_json?: string[] | null;
    sort_order?: number;
  };

  const { data: existingQuestions, error: existingQuestionsError } = await supabase
    .from("task_template_questions")
    .select("id")
    .eq("template_id", id);
  if (existingQuestionsError) {
    return NextResponse.json({ error: existingQuestionsError.message }, { status: 500 });
  }

  const incomingIds = new Set(
    (questions as QuestionInput[])
      .map((q) => (typeof q.id === "string" && q.id ? q.id : null))
      .filter(Boolean) as string[]
  );

  for (const row of existingQuestions ?? []) {
    if (incomingIds.has(row.id)) continue;
    const { count, error: answerCountError } = await supabase
      .from("task_instance_answers")
      .select("id", { count: "exact", head: true })
      .eq("question_id", row.id);
    if (answerCountError) {
      return NextResponse.json({ error: answerCountError.message }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      const { error: softDeleteError } = await supabase
        .from("task_template_questions")
        .update({ is_active: false })
        .eq("id", row.id);
      if (softDeleteError) {
        return NextResponse.json({ error: softDeleteError.message }, { status: 500 });
      }
    } else {
      const { error: hardDeleteError } = await supabase
        .from("task_template_questions")
        .delete()
        .eq("id", row.id);
      if (hardDeleteError) {
        return NextResponse.json({ error: hardDeleteError.message }, { status: 500 });
      }
    }
  }

  for (const [i, q] of (questions as QuestionInput[]).entries()) {
    const payload = {
      template_id: id,
      question_text: q.question_text?.trim() ?? "",
      answer_type: q.answer_type ?? "text",
      is_required: q.is_required !== false,
      options_json: q.options_json ?? null,
      sort_order: q.sort_order ?? i,
      is_active: true,
    };
    if (q.id) {
      const { error: upsertError } = await supabase
        .from("task_template_questions")
        .update(payload)
        .eq("id", q.id)
        .eq("template_id", id);
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from("task_template_questions").insert(payload);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  // Whenever a task template is updated, generate today's task instances so assignees see them instantly.
  // Cron continues to run for recurring tasks on future days.
  await generateTasksForToday(
    id,
    assign_to_type ?? "user",
    assign_to_id || null,
    is_active !== false,
    start_date || null,
    end_date || null
  );

  return NextResponse.json({ ok: true });
}
