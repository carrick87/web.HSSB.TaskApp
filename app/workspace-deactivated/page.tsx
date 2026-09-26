import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logout } from "@/app/actions/auth";

export default async function WorkspaceDeactivatedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Workspace access removed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-700">
          <p>
            Your membership in this workspace is no longer active. An administrator must reactivate you
            before you can return.
          </p>
          <p>
            Contact{" "}
            <a href="mailto:support@harrisons.com.my" className="text-brand-700 hover:underline">
              support@harrisons.com.my
            </a>{" "}
            if you believe this is a mistake.
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
