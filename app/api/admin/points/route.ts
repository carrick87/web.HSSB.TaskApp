import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { getActiveOrgIdForUser } from "@/lib/org/active-org";

export async function GET() {
  const orgCtx = await getOrgApiContext(true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();
  const orgId = await getActiveOrgIdForUser(supabase, orgCtx.userId);
  if (!orgId) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const { data, error } = await supabase
    .from("point_settings")
    .select("*")
    .eq("org_id", orgId)
    .order("event_type");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const orgCtx = await getOrgApiContext(true);
  if (orgCtx instanceof NextResponse) return orgCtx;

  const supabase = await createClient();
  const orgId = await getActiveOrgIdForUser(supabase, orgCtx.userId);
  if (!orgId) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  for (const eventType of ["completed_on_time", "completed_late", "failed", "not_completed"]) {
    if (typeof body[eventType] !== "number") continue;
    await supabase
      .from("point_settings")
      .update({ points: body[eventType], updated_by: orgCtx.userId, updated_at: new Date().toISOString() })
      .eq("event_type", eventType)
      .eq("org_id", orgId);
  }
  return NextResponse.json({ ok: true });
}
