import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <article className="max-w-2xl mx-auto bg-white rounded-atlassian shadow-atlassian-md p-8 prose prose-sm">
        <h1 className="text-2xl font-semibold text-neutral-1000">Privacy Policy (placeholder)</h1>
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-atlassian px-3 py-2 text-sm">
          This page is a placeholder. Legal privacy text for TaskApp must be added before production launch.
        </p>
        <p className="text-neutral-800">
          TaskApp is a multi-tenant task management product. Each organization controls its own member data.
          Account deletion is available under Settings → Account.
        </p>
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </article>
    </main>
  );
}
