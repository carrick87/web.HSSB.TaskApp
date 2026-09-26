import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PRODUCT_NAME } from "@/src/config/product";

export default async function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("organization_invites")
    .select("email, role, status, expires_at, organizations(name, short_name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") notFound();
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invitation expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-700">Ask your workspace admin to resend the invite.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgName =
    (invite.organizations as { name?: string; short_name?: string | null } | null)?.name ?? "Workspace";
  const signupHref = `/login?mode=signup&email=${encodeURIComponent(invite.email)}&invite=${encodeURIComponent(token)}`;
  const loginHref = `/login?email=${encodeURIComponent(invite.email)}&invite=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Join {orgName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-800">
            You have been invited to collaborate on {orgName} in {PRODUCT_NAME}. Sign in or create an account with{" "}
            <strong>{invite.email}</strong> to accept.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={signupHref}>
              <Button className="w-full min-h-[44px]">Create account</Button>
            </Link>
            <Link href={loginHref}>
              <Button variant="secondary" className="w-full min-h-[44px]">
                Sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
