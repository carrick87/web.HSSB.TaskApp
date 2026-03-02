"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function BranchRow({
  branch,
}: {
  branch: { id: string; name: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(branch.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (name.trim() === branch.name) {
      setEditing(false);
      return;
    }
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
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
    if (!confirm(`Delete branch "${branch.name}"? This may fail if users or departments are linked to it.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, { method: "DELETE" });
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
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm flex-1 min-w-[120px]"
            autoFocus
          />
          <Button size="sm" onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(branch.name); setError(null); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span>{branch.name}</span>
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
