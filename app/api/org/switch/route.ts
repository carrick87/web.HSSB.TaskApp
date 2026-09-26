import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/org/authenticated-api";
import { switchCurrentOrg } from "@/lib/org/workspace-access";

export async function POST(request: Request) {
  const auth = await getAuthenticatedUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const orgId = body.org_id;
  if (typeof orgId !== "string") {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await switchCurrentOrg(supabase, auth.userId, orgId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, org_id: orgId });
}
