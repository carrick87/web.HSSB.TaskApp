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
      className="w-full text-left px-3 text-sm hover:bg-neutral-100 rounded-atlassian transition-colors disabled:opacity-50 tap-target"
      style={{ color: '#172B4D', minHeight: '44px' }}
    >
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
