import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog } from "@/lib/admin/audit";
import { DEFAULT_COMPANY } from "@/lib/company/constants";
import { COMPANY_ROW_ID } from "@/lib/company/profile";
import { validateCompanyPayload } from "@/lib/company/validate";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", COMPANY_ROW_ID)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ profile: DEFAULT_COMPANY });
  }
  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const validated = validateCompanyPayload(body as Record<string, unknown>);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", COMPANY_ROW_ID)
    .maybeSingle();

  const { data, error } = await supabase
    .from("company_profile")
    .update({
      ...validated.data,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", COMPANY_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: "company_profile.update",
    before: before as Record<string, unknown> | null,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ profile: data });
}
