import { AppLayout } from "@/components/layout/AppLayout";
import { requireProfile } from "@/lib/auth";
import { checkTablesExist } from "@/lib/tasks-v2";

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();
  const tablesExist = await checkTablesExist();

  if (!tablesExist) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-6 pt-16 lg:pt-6">
          <div className="bg-atlassian-yellow-light border border-yellow-200 rounded-atlassian p-6">
            <h2 className="text-base font-semibold text-yellow-800 mb-2">
              Database Setup Required
            </h2>
            <p className="text-yellow-700 text-sm">
              The new project management tables have not been set up yet. Please run the{" "}
              <code className="bg-yellow-100 px-1 rounded-atlassian font-mono text-xs">setup.sql</code>{" "}
              script in the Supabase SQL Editor to enable this feature.
            </p>
            <p className="text-yellow-600 text-sm mt-2">
              See the README for detailed setup instructions.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 pt-16 lg:pt-6">
        {children}
      </div>
    </AppLayout>
  );
}
