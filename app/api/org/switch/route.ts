import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";

export async function POST(request: Request) {
  const ctx = await getOrgApiContext(false);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const orgId = body.org_id;
  if (typeof orgId !== "string") {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ current_org_id: orgId })
    .eq("id", ctx.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, org_id: orgId });
}
