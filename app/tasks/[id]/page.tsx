import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { TaskTemplateQuestion } from "@/types/database.types";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("task_instances")
    .select(
      `
      id,
      status,
      due_date,
      is_late,
      assignment_date,
      pic_comment,
      template:task_templates(id, title, description, requires_verification),
      answers:task_instance_answers(question_id, answer_text, answer_number, answer_boolean, answer_file_url)
    `
    )
    .eq("id", id)
    .eq("assignee_profile_id", profile.id)
    .single();

  if (error || !task) notFound();

  const templateId = Array.isArray(task.template) ? (task.template[0] as { id?: string })?.id : (task.template as { id?: string })?.id;
  if (!templateId) notFound();

  const { data: questions } = await supabase
    .from("task_template_questions")
    .select("*")
    .eq("template_id", templateId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const t = task as unknown as {
    id: string;
    status: string;
    due_date: string;
    is_late: boolean;
    pic_comment: string | null;
    template: unknown;
    answers?: Array<{ question_id: string; answer_text: string | null; answer_number: number | null; answer_boolean: boolean | null; answer_file_url: string | null }>;
    task_instance_answers?: Array<{ question_id: string; answer_text: string | null; answer_number: number | null; answer_boolean: boolean | null; answer_file_url: string | null }>;
  };
  const answersList = Array.isArray(t.answers) ? t.answers : Array.isArray(t.task_instance_answers) ? t.task_instance_answers : [];
  const taskTitle = Array.isArray(t.template) ? (t.template[0] as { title?: string })?.title : (t.template as { title?: string })?.title;
  const taskDesc = Array.isArray(t.template) ? (t.template[0] as { description?: string })?.description : (t.template as { description?: string })?.description;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-neutral-700 hover:underline text-sm"
        >
          ← Back to dashboard
        </Link>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{taskTitle ?? "Task"}</CardTitle>
              {taskDesc && (
                <p className="text-sm text-neutral-700 mt-1">
                  {taskDesc}
                </p>
              )}
            </div>
            <StatusBadge status={t.status as "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-700">
            Due: {new Date(t.due_date).toLocaleString()}
            {t.is_late && (
              <span className="ml-2 text-atlassian-yellow">(Late)</span>
            )}
          </p>
          {t.status === "rejected" && t.pic_comment && (
            <div className="rounded-lg bg-atlassian-red-light p-3 text-sm text-atlassian-red">
              <strong>PIC comment:</strong> {t.pic_comment}
            </div>
          )}
          <TaskForm
            taskId={t.id}
            status={t.status as "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed"}
            questions={(questions ?? []) as TaskTemplateQuestion[]}
            existingAnswers={answersList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
