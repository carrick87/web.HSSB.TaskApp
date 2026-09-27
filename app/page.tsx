import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-neutral-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-700 rounded-atlassian mb-6 shadow-atlassian-md">
          <span className="text-white font-bold text-3xl">TA</span>
        </div>
        <h1 className="text-3xl font-semibold text-neutral-1000 mb-2">
          TaskApp
        </h1>
        <p className="text-neutral-700 mb-8 max-w-sm">
          Task management for teams — create a workspace or join one you were invited to.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-10 px-6 rounded-atlassian bg-brand-700 text-white font-medium hover:bg-brand-800 active:bg-brand-900 transition-colors shadow-atlassian-sm"
        >
          Sign in
        </Link>
        <Link
          href="/login?mode=signup"
          className="inline-flex items-center justify-center h-10 px-6 rounded-atlassian border border-neutral-300 bg-white text-neutral-900 font-medium hover:bg-neutral-50 transition-colors"
        >
          Sign up
        </Link>
        </div>
      </div>
    </main>
  );
}
