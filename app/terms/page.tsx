import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <article className="max-w-2xl mx-auto bg-white rounded-atlassian shadow-atlassian-md p-8">
        <h1 className="text-2xl font-semibold text-neutral-1000">Terms of Service (placeholder)</h1>
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-atlassian px-3 py-2 text-sm mt-4">
          This page is a placeholder. Legal terms for TaskApp must be added before App Store submission.
        </p>
        <p className="text-neutral-800 mt-4">
          By using TaskApp you agree to use the service responsibly and to comply with your organization&apos;s policies.
        </p>
        <Link href="/login" className="text-brand-700 hover:underline inline-block mt-6">
          Back to sign in
        </Link>
      </article>
    </main>
  );
}
