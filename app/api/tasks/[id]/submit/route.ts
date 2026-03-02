import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: task, error: taskError } = await supabase
    .from("task_instances")
    .select("id, status, due_date, assignee_profile_id")
    .eq("id", taskId)
    .eq("assignee_profile_id", user.id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.status !== "accepted" && task.status !== "rejected") {
    return NextResponse.json({ error: "Task must be accepted or rejected (to resubmit)" }, { status: 400 });
  }

  const formData = await request.formData();
  const dueDate = new Date(task.due_date);
  const submittedAt = new Date();
  const isLate = submittedAt > dueDate;

  const prefix = `${user.id}/${taskId}`;

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file_") && value instanceof File && value.size > 0) {
      if (value.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File too large (max 10MB)" },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(value.type)) {
        return NextResponse.json(
          { error: "File type not allowed" },
          { status: 400 }
        );
      }
    }
  }

  const questionIds = new Set<string>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file_")) {
      questionIds.add(key.replace(/^file_/, ""));
    } else {
      questionIds.add(key);
    }
  }

  const existingFileUrls: Record<string, string> = {};
  if (task.status === "rejected") {
    const { data: existingAnswers } = await supabase
      .from("task_instance_answers")
      .select("question_id, answer_file_url")
      .eq("task_instance_id", taskId);
    for (const a of existingAnswers ?? []) {
      if (a.answer_file_url) existingFileUrls[a.question_id] = a.answer_file_url;
      questionIds.add(a.question_id);
    }
  }

  const { data: questions } = await supabase
    .from("task_template_questions")
    .select("id, answer_type")
    .in("id", Array.from(questionIds));

  const answersToUpsert: Array<{
    task_instance_id: string;
    question_id: string;
    answer_text: string | null;
    answer_number: number | null;
    answer_boolean: boolean | null;
    answer_file_url: string | null;
  }> = [];

  for (const q of questions ?? []) {
    if (q.answer_type === "file") {
      const file = formData.get(`file_${q.id}`) as File | null;
      let url: string | null = (file && file.size > 0) ? null : existingFileUrls[q.id] ?? null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() ?? "bin";
        const name = `${q.id}-${Date.now()}.${ext}`;
        const path = `${prefix}/${name}`;
        const { error: uploadError } = await supabase.storage
          .from("task-files")
          .upload(path, file, { upsert: true });
        if (uploadError) {
          return NextResponse.json(
            { error: "File upload failed: " + uploadError.message },
            { status: 500 }
          );
        }
        url = path;
      }
      answersToUpsert.push({
        task_instance_id: taskId,
        question_id: q.id,
        answer_text: null,
        answer_number: null,
        answer_boolean: null,
        answer_file_url: url,
      });
    } else {
      const raw = formData.get(q.id);
      const v = raw === null || raw === undefined ? null : String(raw).trim();
      if (v === "" || v === null) continue;
      if (q.answer_type === "number") {
        answersToUpsert.push({
          task_instance_id: taskId,
          question_id: q.id,
          answer_text: null,
          answer_number: Number(v),
          answer_boolean: null,
          answer_file_url: null,
        });
      } else if (q.answer_type === "boolean") {
        answersToUpsert.push({
          task_instance_id: taskId,
          question_id: q.id,
          answer_text: null,
          answer_number: null,
          answer_boolean: v === "true",
          answer_file_url: null,
        });
      } else {
        answersToUpsert.push({
          task_instance_id: taskId,
          question_id: q.id,
          answer_text: v,
          answer_number: null,
          answer_boolean: null,
          answer_file_url: null,
        });
      }
    }
  }

  await supabase
    .from("task_instance_answers")
    .delete()
    .eq("task_instance_id", taskId);
  if (answersToUpsert.length > 0) {
    await supabase.from("task_instance_answers").insert(answersToUpsert);
  }

  const { error: updateError } = await supabase
    .from("task_instances")
    .update({
      status: "submitted",
      submitted_at: submittedAt.toISOString(),
      is_late: isLate,
      pic_comment: null,
    })
    .eq("id", taskId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
