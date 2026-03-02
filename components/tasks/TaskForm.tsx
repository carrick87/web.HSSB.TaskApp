"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FileAnswerView } from "@/components/tasks/FileAnswerView";
import type { TaskTemplateQuestion } from "@/types/database.types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
function isImageFile(file: File) {
  return IMAGE_TYPES.includes(file.type);
}

type TaskStatus = "pending" | "accepted" | "submitted" | "verified" | "rejected" | "failed";

type AnswerPayload = {
  question_id: string;
  answer_text?: string | null;
  answer_number?: number | null;
  answer_boolean?: boolean | null;
  answer_file_url?: string | null;
};

type ExistingAnswer = {
  question_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_file_url: string | null;
};

export function TaskForm({
  taskId,
  status,
  questions,
  existingAnswers,
}: {
  taskId: string;
  status: TaskStatus;
  questions: TaskTemplateQuestion[];
  existingAnswers: ExistingAnswer[];
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean | null>>(() => {
    const init: Record<string, string | number | boolean | null> = {};
    for (const a of existingAnswers) {
      const v = a.answer_text ?? a.answer_number ?? a.answer_boolean ?? null;
      if (a.question_id && v !== null) init[a.question_id] = v;
    }
    return init;
  });
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const filePreviewUrlsRef = useRef<Record<string, string>>({});
  filePreviewUrlsRef.current = filePreviewUrls;

  useEffect(() => {
    return () => {
      Object.values(filePreviewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function setFileForQuestion(questionId: string, file: File | null) {
    setFiles((prev) => ({ ...prev, [questionId]: file }));
    setFilePreviewUrls((prev) => {
      const next = { ...prev };
      if (next[questionId]) {
        URL.revokeObjectURL(next[questionId]);
        delete next[questionId];
      }
      if (file && isImageFile(file)) {
        next[questionId] = URL.createObjectURL(file);
      }
      return next;
    });
  }

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/accept`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to accept");
        return;
      }
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const q of questions) {
        const v = answers[q.id];
        if (q.answer_type === "file" && files[q.id]) {
          formData.append(`file_${q.id}`, files[q.id]!);
        } else if (v !== undefined && v !== null && v !== "") {
          formData.append(q.id, String(v));
        }
      }

      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to submit");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "pending") {
    return (
      <div>
        <Button onClick={handleAccept} disabled={accepting}>
          {accepting ? "Accepting…" : "Accept task"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (status === "submitted" || status === "verified" || status === "failed") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {status === "verified" && "This task has been verified."}
          {status === "submitted" && "Awaiting verification."}
          {status === "failed" && "This task was marked as failed."}
        </p>
        {questions.length > 0 && (
          <div className="space-y-3">
            {questions.map((q) => {
              const answer = existingAnswers.find((a) => a.question_id === q.id);
              let value: React.ReactNode = "—";
              if (answer?.answer_file_url) {
                value = <FileAnswerView path={answer.answer_file_url} />;
              } else if (answer != null) {
                if (answer.answer_text != null && answer.answer_text !== "") value = answer.answer_text;
                else if (answer.answer_number != null) value = String(answer.answer_number);
                else if (answer.answer_boolean != null) value = answer.answer_boolean ? "Yes" : "No";
              }
              return (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{q.question_text}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{value}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // accepted or rejected: show editable form (rejected can redo and resubmit)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "rejected" && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
          This task was rejected. Update your answers below and submit again for verification.
        </div>
      )}
      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {q.question_text}
            {q.is_required && <span className="text-red-500"> *</span>}
          </label>
          {q.answer_type === "text" && (
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              required={q.is_required}
            />
          )}
          {q.answer_type === "number" && (
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={(answers[q.id] as number) ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.id]: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              required={q.is_required}
            />
          )}
          {q.answer_type === "boolean" && (
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={(answers[q.id] as boolean) === true ? "true" : (answers[q.id] as boolean) === false ? "false" : ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.id]: e.target.value === "" ? null : e.target.value === "true",
                }))
              }
              required={q.is_required}
            >
              <option value="">Select</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          )}
          {q.answer_type === "choice" && (
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              required={q.is_required}
            >
              <option value="">Select</option>
              {(Array.isArray(q.options_json) ? q.options_json : []).map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {q.answer_type === "file" && (
            <div className="space-y-2">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium"
                onChange={(e) =>
                  setFileForQuestion(q.id, e.target.files?.[0] ?? null)
                }
              />
              {filePreviewUrls[q.id] && (
                <div className="flex items-start gap-3">
                  <img
                    src={filePreviewUrls[q.id]}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border border-slate-200 dark:border-slate-600"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sm"
                    onClick={() => setFileForQuestion(q.id, null)}
                  >
                    Remove photo
                  </Button>
                </div>
              )}
              {files[q.id] && !filePreviewUrls[q.id] && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selected: {files[q.id]?.name}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit for verification"}
      </Button>
    </form>
  );
}
