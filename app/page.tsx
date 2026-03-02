import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        TaskApp
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Harrison Sabah Sdn Bhd — Internal Task Management
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-6 py-3 font-medium hover:opacity-90"
      >
        Log in
      </Link>
    </main>
  );
}
