import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  ALLOWED_LOGO_MIME_TYPES,
  COMPANY_LOGO_BUCKET,
  COMPANY_LOGO_MAX_BYTES,
} from "@/lib/company/constants";
import { COMPANY_ROW_ID } from "@/lib/company/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
  }
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "Logo must be PNG, JPG, WebP, or SVG." }, { status: 400 });
  }
  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 });
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1] || "png";
  const path = `logo-${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("company_profile").select("*").eq("id", COMPANY_ROW_ID).maybeSingle();

  const { data, error } = await supabase
    .from("company_profile")
    .update({ logo_path: path, updated_at: new Date().toISOString(), updated_by: auth.userId })
    .eq("id", COMPANY_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (before?.logo_path && before.logo_path !== path) {
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([before.logo_path]);
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: "company_profile.logo_upload",
    before: before as Record<string, unknown> | null,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ profile: data });
}

export async function DELETE() {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const { data: before } = await supabase.from("company_profile").select("*").eq("id", COMPANY_ROW_ID).maybeSingle();

  const { data, error } = await supabase
    .from("company_profile")
    .update({ logo_path: null, updated_at: new Date().toISOString(), updated_by: auth.userId })
    .eq("id", COMPANY_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (before?.logo_path) {
    const admin = createAdminClient();
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([before.logo_path]);
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: "company_profile.logo_remove",
    before: before as Record<string, unknown> | null,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ profile: data });
}
