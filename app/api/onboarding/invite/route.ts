import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { ORG_ROLES } from "@/lib/org/roles";

export async function POST(request: Request) {
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const emails: string[] = Array.isArray(body.emails) ? body.emails : [];
  if (!emails.length) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  const admin = createAdminClient();
  for (const raw of emails) {
    const email = String(raw).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const { data: invite } = await admin
      .from("organization_invites")
      .insert({
        org_id: ctx.orgId,
        email,
        role: ORG_ROLES.MEMBER,
        status: "pending",
        invited_by: ctx.userId,
      })
      .select("token")
      .single();
    if (invite?.token) {
      const { enqueueWorkspaceInviteEmail } = await import("@/lib/email/membership-events");
      await enqueueWorkspaceInviteEmail({
        orgId: ctx.orgId,
        email,
        token: invite.token,
        role: ORG_ROLES.MEMBER,
        inviterUserId: ctx.userId,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
