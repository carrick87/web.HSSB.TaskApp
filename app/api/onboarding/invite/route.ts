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
    await admin.from("organization_invites").insert({
      org_id: ctx.orgId,
      email,
      role: ORG_ROLES.MEMBER,
      status: "pending",
      invited_by: ctx.userId,
    });
    try {
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { org_id: ctx.orgId },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`,
      });
    } catch {
      /* invite email may fail in dev */
    }
  }

  return NextResponse.json({ ok: true });
}
