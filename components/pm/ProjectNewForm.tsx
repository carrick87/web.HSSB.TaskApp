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
        <label className="atlassian-label">
          Project Name *
        </label>
        <input
          name="name"
          type="text"
          required
          className="atlassian-input"
          placeholder="Enter project name"
        />
      </div>

      <div>
        <label className="atlassian-label">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          className="atlassian-input"
          placeholder="Project description (optional)"
        />
      </div>

      <div>
        <label className="atlassian-label">
          Department *
        </label>
        <select
          name="department_id"
          required
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="atlassian-select"
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
          <label className="atlassian-label">
            Add Members (optional)
          </label>
          <div className="border border-neutral-300 rounded-atlassian p-3 max-h-48 overflow-y-auto space-y-2 bg-neutral-50">
            {filteredMembers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="members"
                  value={m.id}
                  defaultChecked={m.id === currentUserId}
                  className="rounded border-neutral-300 text-brand-700 focus:ring-brand-200"
                />
                <span className="text-sm text-neutral-800">
                  {m.username}
                  {m.id === currentUserId && " (you)"}
                  <span className="text-neutral-700 ml-1">
                    ({m.role})
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-neutral-700 mt-1">
            You will be added automatically as a member.
          </p>
        </div>
      )}

      {!selectedDeptId && (
        <p className="text-xs text-atlassian-yellow">
          Select a department to see available members.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/pm/projects"
          className="inline-flex items-center justify-center font-medium rounded-atlassian transition focus:outline-none focus:ring-2 focus:ring-brand-200 bg-neutral-200 text-neutral-800 hover:bg-neutral-300 px-4 py-2 text-sm"
        >
          Cancel
        </Link>
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}
