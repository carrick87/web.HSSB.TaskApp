import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { enqueueWorkspaceInviteEmail } from "@/lib/email/membership-events";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: inviteId } = await params;
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("organization_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("org_id", ctx.orgId)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  await admin
    .from("organization_invites")
    .update({ expires_at: new Date(Date.now() + 14 * 86400000).toISOString() })
    .eq("id", inviteId);

  await enqueueWorkspaceInviteEmail({
    orgId: ctx.orgId,
    email: invite.email,
    token: invite.token,
    role: invite.role,
    inviterUserId: ctx.userId,
  });

  return NextResponse.json({ ok: true });
}
