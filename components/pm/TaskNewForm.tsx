"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Profile, Project } from "@/types/database.types";

interface TaskNewFormProps {
  departments: { id: string; name: string }[];
  projects: Project[];
  allMembers: Profile[];
  defaultDepartmentId: string | null;
  defaultProjectId: string | null;
  isAdmin: boolean;
  handleCreate: (formData: FormData) => Promise<void>;
}

export function TaskNewForm({
  departments,
  projects,
  allMembers,
  defaultDepartmentId,
  defaultProjectId,
  isAdmin,
  handleCreate,
}: TaskNewFormProps) {
  const [selectedDeptId, setSelectedDeptId] = useState(defaultDepartmentId || "");

  const filteredMembers = selectedDeptId
    ? allMembers.filter((m) => m.department_id === selectedDeptId)
    : isAdmin
    ? allMembers
    : [];

  return (
    <form action={handleCreate} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Task Title *
        </label>
        <input
          name="title"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          placeholder="Enter task title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          placeholder="Task description (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Status
          </label>
          <select
            name="status"
            defaultValue="todo"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Priority
          </label>
          <select
            name="priority"
            defaultValue="medium"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Due Date
        </label>
        <input
          name="due_date"
          type="date"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Department *
        </label>
        <select
          name="department_id"
          required
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Project (optional)
        </label>
        <select
          name="project_id"
          defaultValue={defaultProjectId || ""}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">No project (private task)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Private tasks are only visible to the assignee, you, and admins.
          Project tasks are visible to all project members.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Assign To *
        </label>
        <select
          name="assignee_id"
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Select assignee</option>
          {filteredMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.username} ({m.role})
            </option>
          ))}
        </select>
        {!selectedDeptId && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Select a department first to see assignable members.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/pm"
          className="inline-flex items-center justify-center font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500 px-4 py-2 text-sm"
        >
          Cancel
        </Link>
        <Button type="submit">Create Task</Button>
      </div>
    </form>
  );
}
