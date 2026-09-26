import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { VerifyActions } from "@/components/tasks/VerifyActions";
import { FileAnswerView } from "@/components/tasks/FileAnswerView";
import type { TaskTemplateQuestion } from "@/types/database.types";

function assigneeDisplay(a: unknown): { username: string; branchName: string; departmentName: string } {
  const raw = Array.isArray(a) ? a[0] : a;
  const o = (raw ?? {}) as { username?: string; branch?: unknown; department?: unknown };
  const nameOf = (x: unknown) => (Array.isArray(x) ? (x[0] as { name?: string })?.name : (x as { name?: string })?.name) ?? "";
  return {
    username: o.username ?? "—",
    branchName: nameOf(o.branch),
    departmentName: nameOf(o.department),
  };
}

export default async function PicVerifyDetailPage({
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
      assignee_profile_id,
      status,
      submitted_at,
      due_date,
      is_late,
      pic_comment,
      template:task_templates(id, title, description),
      assignee:profiles!assignee_profile_id(id, username, branch:branches(name), department:departments(name))
    `
    )
    .eq("id", id)
    .single();

  if (error || !task) notFound();
  if (task.status !== "submitted") {
    return (
      <div className="space-y-4">
        <p className="text-neutral-700">This task is not awaiting verification.</p>
        <Link href="/pic/verify" className="text-blue-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  if (profile.role === "manager") {
    const assigneeId = (task as { assignee_profile_id: string }).assignee_profile_id;
    const { data: assigneeProfileData } = await supabase
      .from("profiles")
      .select("branch_id, department_id")
      .eq("id", assigneeId)
      .single();
    const sameBranch = profile.branch_id && assigneeProfileData?.branch_id === profile.branch_id;
    const sameDept = profile.department_id && assigneeProfileData?.department_id === profile.department_id;
    if (!sameBranch && !sameDept) notFound();
  }

  const templateId = Array.isArray(task.template) ? (task.template[0] as { id?: string })?.id : (task.template as { id?: string })?.id;
  const { data: questions } = await supabase
    .from("task_template_questions")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  const { data: answers } = await supabase
    .from("task_instance_answers")
    .select("id, question_id, answer_text, answer_number, answer_boolean, answer_file_url")
    .eq("task_instance_id", id);

  const assignee = assigneeDisplay(task.assignee);
  const taskTitle = Array.isArray(task.template) ? (task.template[0] as { title?: string })?.title : (task.template as { title?: string })?.title;
  const answersList = (answers ?? []) as Array<{
    id: string;
    question_id: string;
    answer_text: string | null;
    answer_number: number | null;
    answer_boolean: boolean | null;
    answer_file_url: string | null;
  }>;
  const questionsList = (questions ?? []) as Array<{ id: string; question_text: string; answer_type: string }>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/pic/verify" className="text-sm text-brand-700 hover:underline">
        ← Back to list
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{taskTitle ?? "Task"}</CardTitle>
          <p className="text-sm text-neutral-700">
            Assignee: {assignee.username}
            {assignee.branchName && ` · ${assignee.branchName}`}
            {assignee.departmentName && ` · ${assignee.departmentName}`}
          </p>
          <p className="text-sm text-neutral-700">
            Submitted {task.submitted_at ? new Date(task.submitted_at).toLocaleString() : "—"}
            {task.is_late && <span className="text-atlassian-yellow ml-2">(Late)</span>}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionsList.map((q) => {
            const answer = answersList.find((a) => a.question_id === q.id);
            return (
              <div key={q.id}>
                <p className="font-medium text-neutral-800">
                  {q.question_text}
                </p>
                <p className="text-neutral-700 mt-1">
                  {answer?.answer_file_url ? (
                    <FileAnswerView path={answer.answer_file_url} />
                  ) : (
                    answer?.answer_text ??
                    (answer?.answer_number != null ? String(answer.answer_number) : null) ??
                    (answer?.answer_boolean != null ? (answer.answer_boolean ? "Yes" : "No") : null) ??
                    "—"
                  )}
                </p>
              </div>
            );
          })}
          <VerifyActions taskId={task.id} />
        </CardContent>
      </Card>
    </div>
  );
}
