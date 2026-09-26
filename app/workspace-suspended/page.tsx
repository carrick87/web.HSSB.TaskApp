import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logout } from "@/app/actions/auth";

export default function WorkspaceSuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Workspace suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-700">
          <p>
            This workspace has been suspended. You cannot access its tasks or settings until a platform
            administrator reactivates it.
          </p>
          <p>
            If you belong to another workspace, switch to it from your profile or contact your administrator.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/profile">
              <Button variant="secondary" size="sm">
                Profile
              </Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
