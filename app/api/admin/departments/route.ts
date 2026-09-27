import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { getActiveOrgIdForUser } from "@/lib/org/active-org";

export async function POST(request: Request) {
  const orgCtx = await getOrgApiContext(true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();
  const orgId = await getActiveOrgIdForUser(supabase, orgCtx.userId);
  if (!orgId) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = body.name?.trim();
  const branch_id = body.branch_id;
  if (!name || !branch_id) return NextResponse.json({ error: "Name and branch required" }, { status: 400 });

  const { error } = await supabase.from("departments").insert({ name, branch_id, org_id: orgId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
