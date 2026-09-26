"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type QuestionDraft = {
  id: string;
  question_text: string;
  answer_type: "text" | "number" | "boolean" | "choice" | "file";
  is_required: boolean;
  options: string[];
  sort_order: number;
};

type TemplateDraft = {
  title: string;
  description: string;
  recurrence_type: "daily" | "monthly" | "custom";
  recurrence_value: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  requires_verification: boolean;
  assign_to_type: "user" | "branch" | "department";
  assign_to_id: string;
};

const emptyQuestion = (order: number): QuestionDraft => ({
  id: crypto.randomUUID(),
  question_text: "",
  answer_type: "text",
  is_required: true,
  options: [],
  sort_order: order,
});

export function TemplateForm({
  template,
  questions,
  branches,
  departments,
  staff,
  createdByProfileId,
}: {
  template?: {
    id: string;
    title: string;
    description: string | null;
    recurrence_type: string;
    recurrence_value: number | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    requires_verification: boolean;
    assign_to_type: string;
    assign_to_id: string | null;
  };
  questions?: Array<{
    id: string;
    question_text: string;
    answer_type: string;
    is_required: boolean;
    options_json: string[] | null;
    sort_order: number | null;
  }>;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; branch_id: string }>;
  staff: Array<{ id: string; username: string }>;
  createdByProfileId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateDraft>({
    title: template?.title ?? "",
    description: template?.description ?? "",
    recurrence_type: (template?.recurrence_type as "daily" | "monthly" | "custom") ?? "daily",
    recurrence_value: template?.recurrence_value ?? null,
    start_date: template?.start_date ?? "",
    end_date: template?.end_date ?? "",
    is_active: template?.is_active ?? true,
    requires_verification: template?.requires_verification ?? true,
    assign_to_type: (template?.assign_to_type as "user" | "branch" | "department") ?? "user",
    assign_to_id: template?.assign_to_id ?? "",
  });
  const [questionList, setQuestionList] = useState<QuestionDraft[]>(
    questions?.length
      ? questions.map((q, i) => ({
          id: q.id,
          question_text: q.question_text,
          answer_type: q.answer_type as QuestionDraft["answer_type"],
          is_required: q.is_required,
          options: Array.isArray(q.options_json) ? q.options_json : [],
          sort_order: q.sort_order ?? i,
        }))
      : [emptyQuestion(0)]
  );

  function addQuestion() {
    setQuestionList((prev) => [...prev, emptyQuestion(prev.length)]);
  }

  function removeQuestion(id: string) {
    setQuestionList((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<QuestionDraft>) {
    setQuestionList((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const validQuestions = questionList.filter((q) => q.question_text.trim());
    if (validQuestions.length === 0) {
      setError("At least one question is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        recurrence_type: form.recurrence_type,
        recurrence_value: form.recurrence_type === "custom" ? (form.recurrence_value ?? 1) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
        requires_verification: form.requires_verification,
        assign_to_type: form.assign_to_type,
        assign_to_id: form.assign_to_id || null,
        created_by_profile_id: createdByProfileId,
        questions: validQuestions.map((q, i) => ({
          id: q.id.startsWith("temp-") || template ? undefined : q.id,
          question_text: q.question_text.trim(),
          answer_type: q.answer_type,
          is_required: q.is_required,
          options_json: q.answer_type === "choice" ? q.options : null,
          sort_order: i,
        })),
      };
      const url = template ? `/api/templates/${template.id}` : "/api/templates";
      const method = template ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      router.push("/pic/templates");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const assignOptions =
    form.assign_to_type === "branch"
      ? branches
      : form.assign_to_type === "department"
        ? departments
        : staff;
  const assignLabel =
    form.assign_to_type === "branch"
      ? "Branch"
      : form.assign_to_type === "department"
        ? "Department"
        : "User";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="atlassian-label">
          Title *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="atlassian-input text-neutral-1000"
          required
        />
      </div>
      <div>
        <label className="atlassian-label">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="atlassian-input text-neutral-1000"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="atlassian-label">
            Recurrence
          </label>
          <select
            value={form.recurrence_type}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                recurrence_type: e.target.value as TemplateDraft["recurrence_type"],
              }))
            }
            className="atlassian-input text-neutral-1000"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Every N days</option>
          </select>
        </div>
        {form.recurrence_type === "custom" && (
          <div>
            <label className="atlassian-label">
              Every (days)
            </label>
            <input
              type="number"
              min={1}
              value={form.recurrence_value ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  recurrence_value: e.target.value ? parseInt(e.target.value, 10) : null,
                }))
              }
              className="atlassian-input text-neutral-1000"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="atlassian-label">
            Start date
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
            className="atlassian-input text-neutral-1000"
          />
        </div>
        <div>
          <label className="atlassian-label">
            End date
          </label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
            className="atlassian-input text-neutral-1000"
          />
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="rounded-atlassian border-neutral-300"
          />
          <span className="text-sm text-neutral-800">Active</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.requires_verification}
            onChange={(e) => setForm((p) => ({ ...p, requires_verification: e.target.checked }))}
            className="rounded-atlassian border-neutral-300"
          />
          <span className="text-sm text-neutral-800">Requires verification</span>
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="atlassian-label">
            Assign to
          </label>
          <select
            value={form.assign_to_type}
            onChange={(e) => {
              setForm((p) => ({
                ...p,
                assign_to_type: e.target.value as TemplateDraft["assign_to_type"],
                assign_to_id: "",
              }));
            }}
            className="atlassian-input text-neutral-1000"
          >
            <option value="user">User</option>
            <option value="branch">Branch</option>
            <option value="department">Department</option>
          </select>
        </div>
        <div>
          <label className="atlassian-label">
            {assignLabel}
          </label>
          <select
            value={form.assign_to_id}
            onChange={(e) => setForm((p) => ({ ...p, assign_to_id: e.target.value }))}
            className="atlassian-input text-neutral-1000"
          >
            <option value="">Select</option>
            {assignOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {"name" in o ? o.name : (o as { username: string }).username}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-neutral-800">
            Questions *
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            Add question
          </Button>
        </div>
        <div className="space-y-4">
          {questionList.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-lg border border-neutral-200 p-4 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <input
                  type="text"
                  placeholder="Question text"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                  className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={q.answer_type}
                  onChange={(e) =>
                    updateQuestion(q.id, {
                      answer_type: e.target.value as QuestionDraft["answer_type"],
                      options: e.target.value === "choice" ? [] : [],
                    })
                  }
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes/No</option>
                  <option value="choice">Choice</option>
                  <option value="file">File</option>
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={q.is_required}
                    onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })}
                    className="rounded"
                  />
                  Required
                </label>
              </div>
              {q.answer_type === "choice" && (
                <div className="text-sm">
                  <p className="text-neutral-600 mb-1">Options (one per line)</p>
                  <textarea
                    value={q.options.join("\n")}
                    onChange={(e) =>
                      updateQuestion(q.id, {
                        options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Option 1&#10;Option 2"
                    className="w-full rounded border border-neutral-300 bg-white px-2 py-1"
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : template ? "Update template" : "Create template"}
      </Button>
    </form>
  );
}
