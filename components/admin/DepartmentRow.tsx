"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Dept = {
  id: string;
  name: string;
  branch_id: string;
  branch?: { name: string } | { name: string }[];
};

export function DepartmentRow({
  department,
  branches,
}: {
  department: Dept;
  branches: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const branchName = Array.isArray(department.branch)
    ? department.branch[0]?.name
    : (department.branch as { name?: string })?.name;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [branchId, setBranchId] = useState(department.branch_id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if ((name.trim() === department.name && branchId === department.branch_id)) {
      setEditing(false);
      return;
    }
    if (!name.trim() || !branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/departments/${department.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), branch_id: branchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete department "${department.name}"? This may fail if users are linked to it.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/departments/${department.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      {editing ? (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm w-40"
          />
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm w-40"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={handleSave} disabled={loading || !name.trim() || !branchId}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(department.name); setBranchId(department.branch_id); setError(null); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span>{department.name}</span>
            <span className="text-slate-500 text-sm">{branchName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </li>
  );
}
