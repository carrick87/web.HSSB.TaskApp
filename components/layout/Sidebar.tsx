"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TaskIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function getNavSections(role: string): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> },
      ],
    },
    {
      title: "My Work",
      items: [
        { href: "/tasks/upcoming", label: "Upcoming Tasks", icon: <CalendarIcon /> },
        { href: "/tasks/history", label: "History", icon: <HistoryIcon /> },
        { href: "/profile", label: "My Profile", icon: <UserIcon /> },
      ],
    },
    {
      title: "Projects",
      items: [
        { href: "/pm", label: "My Tasks", icon: <TaskIcon /> },
      ],
    },
  ];

  if (role === "pic" || role === "admin") {
    sections[2].items.push(
      { href: "/pm/team", label: "Team Tasks", icon: <UsersIcon /> },
      { href: "/pm/projects", label: "All Projects", icon: <FolderIcon /> }
    );
    
    sections.push({
      title: "PIC Tools",
      items: [
        { href: "/pic/dashboard", label: "PIC Dashboard", icon: <ChartIcon /> },
        { href: "/pic/verify", label: "Verify Tasks", icon: <CheckIcon /> },
        { href: "/pic/templates", label: "Templates", icon: <TemplateIcon /> },
        { href: "/pic/reports", label: "Reports", icon: <ChartIcon /> },
      ],
    });
  }

  if (role === "admin") {
    sections.push({
      title: "Administration",
      items: [
        { href: "/admin", label: "Admin Panel", icon: <CogIcon /> },
      ],
    });
  }

  sections.push({
    items: [
      { href: "/leaderboard", label: "Leaderboard", icon: <TrophyIcon /> },
    ],
  });

  return sections;
}

export function Sidebar({
  username,
  role,
}: {
  username: string;
  role: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const sections = getNavSections(role);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (href === "/pm") return pathname === href;
    return pathname.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            {section.title && (
              <h3 className="px-4 mb-2 text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <nav className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-2 py-2 rounded-atlassian text-sm transition-colors ${
                      active
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span className={active ? "text-brand-600" : "text-neutral-700"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{username}</p>
            <p className="text-xs text-neutral-700 capitalize">{role}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed z-40 p-2 rounded-atlassian bg-white shadow-atlassian text-neutral-700 hover:bg-neutral-50"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0px))', left: 'max(0.75rem, env(safe-area-inset-left, 0px))' }}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-neutral-1000/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-700 rounded-atlassian flex items-center justify-center">
              <span className="text-white font-bold text-sm">HS</span>
            </div>
            <span className="font-semibold text-neutral-900">TaskApp</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-neutral-700 hover:text-neutral-700"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-neutral-200">
        <div className="flex items-center h-14 px-4 border-b border-neutral-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-700 rounded-atlassian flex items-center justify-center">
              <span className="text-white font-bold text-sm">HS</span>
            </div>
            <span className="font-semibold text-neutral-900">TaskApp</span>
          </Link>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
