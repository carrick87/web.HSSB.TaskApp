import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";

export async function GET() {
  const ctx = await getOrgApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", ctx.orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}

export async function PUT(request: Request) {
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const { validateOrganizationPayload } = await import("@/lib/org/validate");
  const validated = validateOrganizationPayload(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("organizations").select("*").eq("id", ctx.orgId).single();

  const { data, error } = await supabase
    .from("organizations")
    .update(validated.data)
    .eq("id", ctx.orgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { writeOrgAuditLog } = await import("@/lib/org/audit");
  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: "organization.update",
    before: before as Record<string, unknown>,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ organization: data });
}
