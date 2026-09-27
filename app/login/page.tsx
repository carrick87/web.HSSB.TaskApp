import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { productBrandAsCompanyProfile } from "@/lib/org/branding";
import LoginForm from "./LoginForm";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { fetchMyWorkspaces, pickAlternateActiveWorkspace } from "@/lib/org/workspace-access";
import { switchWorkspaceAction } from "@/app/actions/workspace-switch";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user && error !== "deactivated") redirect("/dashboard");

  if (user && error === "deactivated") {
    const supabase = await createClient();
    const workspaces = await fetchMyWorkspaces(supabase);
    const alternate = pickAlternateActiveWorkspace(workspaces, null);

    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
        <div className="w-full max-w-md bg-white rounded-atlassian shadow-atlassian-md p-8 space-y-4">
          <h1 className="text-lg font-semibold text-neutral-1000">Access removed</h1>
          <p className="text-sm text-neutral-700">
            Your membership in this workspace is no longer active. Sign out to use a different account,
            or switch to another workspace if you have one.
          </p>
          {alternate ? (
            <form action={switchWorkspaceAction.bind(null, alternate.org_id)}>
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                Switch to {alternate.org_name}
              </Button>
            </form>
          ) : null}
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const company = productBrandAsCompanyProfile();

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <LoginForm company={company} />
    </main>
  );
}
