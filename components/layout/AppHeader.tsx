import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { logout } from "@/app/actions/auth";

export async function AppHeader() {
  const profile = await requireProfile();

  function NavLinks() {
    const links: { href: string; label: string }[] = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/tasks/upcoming", label: "Upcoming" },
      { href: "/tasks/history", label: "History" },
      { href: "/profile", label: "Profile" },
    ];
    if (profile.role === "pic" || profile.role === "admin") {
      links.push({ href: "/pic/dashboard", label: "PIC" });
      links.push({ href: "/pic/verify", label: "Verify" });
      links.push({ href: "/pic/templates", label: "Task manager" });
      links.push({ href: "/pic/reports", label: "Reports" });
    }
    if (profile.role === "admin") {
      links.push({ href: "/admin", label: "Admin" });
    }
    links.push({ href: "/leaderboard", label: "Leaderboard" });

    return (
      <>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium"
          >
            {l.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-slate-900 dark:text-slate-100">
            TaskApp
          </Link>
          <nav className="flex items-center gap-4">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {profile.username}
          </span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
