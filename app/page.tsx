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
          <span className="text-white font-bold text-3xl">HS</span>
        </div>
        <h1 className="text-3xl font-semibold text-neutral-1000 mb-2">
          TaskApp
        </h1>
        <p className="text-neutral-700 mb-8 max-w-sm">
          Internal task management system for Harrison Sabah Sdn Bhd
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-10 px-6 rounded-atlassian bg-brand-700 text-white font-medium hover:bg-brand-800 active:bg-brand-900 transition-colors shadow-atlassian-sm"
        >
          Sign in to continue
        </Link>
      </div>
    </main>
  );
}
