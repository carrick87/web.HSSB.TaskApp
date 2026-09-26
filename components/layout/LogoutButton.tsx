"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full text-left px-2 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-atlassian transition-colors disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
