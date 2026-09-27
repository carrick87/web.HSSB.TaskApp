"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function TaskWatchToggle({
  taskId,
  initialWatching,
}: {
  taskId: string;
  initialWatching: boolean;
}) {
  const [watching, setWatching] = useState(initialWatching);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/watch`, {
        method: watching ? "DELETE" : "POST",
      });
      if (res.ok) setWatching(!watching);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={toggle} className="min-h-[44px]">
      {watching ? "Unwatch" : "Watch"}
    </Button>
  );
}
