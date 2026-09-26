"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Profile } from "@/types/database.types";

interface ProjectNewFormProps {
  departments: { id: string; name: string }[];
  allMembers: Profile[];
  defaultDepartmentId: string | null;
  currentUserId: string;
  isAdmin: boolean;
  handleCreate: (formData: FormData) => Promise<void>;
}

export function ProjectNewForm({
  departments,
  allMembers,
  defaultDepartmentId,
  currentUserId,
  isAdmin,
  handleCreate,
}: ProjectNewFormProps) {
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
          Project Name *
        </label>
        <input
          name="name"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          placeholder="Enter project name"
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
          placeholder="Project description (optional)"
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

      {filteredMembers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Add Members (optional)
          </label>
          <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            {filteredMembers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="members"
                  value={m.id}
                  defaultChecked={m.id === currentUserId}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {m.username}
                  {m.id === currentUserId && " (you)"}
                  <span className="text-slate-500 dark:text-slate-400 ml-1">
                    ({m.role})
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You will be added automatically as a member.
          </p>
        </div>
      )}

      {!selectedDeptId && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Select a department to see available members.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/pm/projects"
          className="inline-flex items-center justify-center font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500 px-4 py-2 text-sm"
        >
          Cancel
        </Link>
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}
