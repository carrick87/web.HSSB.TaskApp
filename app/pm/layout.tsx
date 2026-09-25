import { AppHeader } from "@/components/layout/AppHeader";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { checkTablesExist } from "@/lib/tasks-v2";

function PMNav({ role }: { role: string }) {
  const links = [
    { href: "/pm", label: "My Tasks" },
  ];
  
  if (role === "pic" || role === "admin") {
    links.push({ href: "/pm/team", label: "Team Tasks" });
    links.push({ href: "/pm/projects", label: "Projects" });
  }

  return (
    <nav className="flex gap-2 mb-6">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const tablesExist = await checkTablesExist();

  if (!tablesExist) {
    return (
      <>
        <AppHeader />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Database Setup Required
            </h2>
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              The new project management tables have not been set up yet. Please run the{" "}
              <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">setup.sql</code>{" "}
              script in the Supabase SQL Editor to enable this feature.
            </p>
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
              See the README for detailed setup instructions.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Project Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage tasks and projects for your team
          </p>
        </div>
        <PMNav role={profile.role} />
        {children}
      </main>
    </>
  );
}
