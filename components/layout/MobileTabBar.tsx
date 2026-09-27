"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeNavIcon,
  NotificationsNavIcon,
  ProfileNavIcon,
  TasksNavIcon,
} from "./MobileNavIcons";

const tabs = [
  {
    href: "/dashboard",
    label: "Home",
    match: (p: string) => p === "/dashboard",
    Icon: HomeNavIcon,
  },
  {
    href: "/pm",
    label: "Tasks",
    match: (p: string) => p.startsWith("/pm") || p.startsWith("/tasks"),
    Icon: TasksNavIcon,
  },
  {
    href: "/notifications",
    label: "Notifications",
    match: (p: string) => p.startsWith("/notifications"),
    Icon: NotificationsNavIcon,
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings/account"),
    Icon: ProfileNavIcon,
  },
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
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center tap-target py-1.5 text-xs font-medium gap-0.5"
            style={{
              color: active ? "#0052CC" : "var(--text-secondary)",
              minHeight: "56px",
            }}
          >
            <Icon active={active} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
