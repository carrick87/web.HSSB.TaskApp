import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logout } from "@/app/actions/auth";
import { fetchMyOrgStatus, fetchMyWorkspaces, pickAlternateActiveWorkspace } from "@/lib/org/workspace-access";
import { switchWorkspaceAction } from "@/app/actions/workspace-switch";

export default async function WorkspaceSuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", user.id)
    .single();

  const currentStatus = profile?.current_org_id
    ? await fetchMyOrgStatus(supabase, profile.current_org_id)
    : null;

  const workspaces = await fetchMyWorkspaces(supabase);
  const alternate = pickAlternateActiveWorkspace(workspaces, profile?.current_org_id ?? null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Workspace suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-700">
          <p>
            {currentStatus?.org_name
              ? `${currentStatus.org_name} has been suspended.`
              : "This workspace has been suspended."}{" "}
            You cannot access its tasks or settings until a platform administrator reactivates it.
          </p>
          {alternate ? (
            <form action={switchWorkspaceAction.bind(null, alternate.org_id)}>
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                Switch to {alternate.org_name}
              </Button>
            </form>
          ) : (
            <p>You do not have another active workspace to switch to.</p>
          )}
          <p>
            Need help? Contact{" "}
            <a href="mailto:support@harrisons.com.my" className="text-brand-700 hover:underline">
              support@harrisons.com.my
            </a>
            .
          </p>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
