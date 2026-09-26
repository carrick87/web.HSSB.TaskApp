"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const LABELS: Record<string, string> = {
  completed_on_time: "Completed on time",
  completed_late: "Completed late",
  failed: "Failed",
  not_completed: "Not completed",
};

export function PointSettingsForm({
  settings,
}: {
  settings: Array<{ id: string; event_type: string; points: number }>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    for (const s of settings) v[s.event_type] = s.points;
    return v;
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/points", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {settings.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-neutral-800">
            {LABELS[s.event_type] ?? s.event_type}
          </label>
          <input
            type="number"
            value={values[s.event_type] ?? s.points}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [s.event_type]: parseInt(e.target.value, 10) || 0 }))
            }
            className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2"
          />
        </div>
      ))}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
    </form>
  );
}
