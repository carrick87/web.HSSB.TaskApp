"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard" },
  { href: "/pm", label: "Tasks", match: (p: string) => p.startsWith("/pm") || p.startsWith("/tasks") },
  { href: "/notifications", label: "Notifications", match: (p: string) => p.startsWith("/notifications") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings/account") },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white flex"
      style={{
        borderColor: "var(--neutral-border)",
        paddingBottom: "var(--safe-area-inset-bottom)",
      }}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center tap-target py-2 text-xs font-medium"
            style={{
              color: active ? "var(--brand-primary)" : "var(--text-secondary)",
              minHeight: "56px",
            }}
          >
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
