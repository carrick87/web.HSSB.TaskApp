import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/admin/api-auth";
import { writeAuditLog } from "@/lib/admin/audit";
import { COMPANY_LOGO_BUCKET, type LogoVariant } from "@/lib/company/constants";
import { validateLogoUpload } from "@/lib/company/validate-logo";
import { COMPANY_ROW_ID } from "@/lib/company/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const COLUMN: Record<LogoVariant, "logo_wide_path" | "logo_square_path"> = {
  wide: "logo_wide_path",
  square: "logo_square_path",
};

function parseVariant(value: FormDataEntryValue | null): LogoVariant | null {
  if (value === "wide" || value === "square") return value;
  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const file = form.get("file");
  const variant = parseVariant(form.get("variant"));
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
  }
  if (!variant) {
    return NextResponse.json({ error: "Logo variant must be wide or square." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = await validateLogoUpload(
    { type: file.type, size: file.size },
    bytes,
    variant
  );
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ext =
    file.type === "image/svg+xml" ? "svg" : file.type === "image/jpeg" ? "jpg" : "png";
  const path = `logo-${variant}-${Date.now()}.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", COMPANY_ROW_ID)
    .maybeSingle();

  const column = COLUMN[variant];
  const { data, error } = await supabase
    .from("company_profile")
    .update({
      [column]: path,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", COMPANY_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prevPath = before?.[column] as string | null | undefined;
  if (prevPath && prevPath !== path) {
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([prevPath]);
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: `company_profile.logo_${variant}_upload`,
    before: before as Record<string, unknown> | null,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ profile: data });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const variantParam = url.searchParams.get("variant");
  const variant =
    variantParam === "wide" || variantParam === "square" ? variantParam : null;
  if (!variant) {
    return NextResponse.json({ error: "Query param variant=wide|square required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", COMPANY_ROW_ID)
    .maybeSingle();

  const column = COLUMN[variant];
  const { data, error } = await supabase
    .from("company_profile")
    .update({
      [column]: null,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq("id", COMPANY_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prevPath = before?.[column] as string | null | undefined;
  if (prevPath) {
    const admin = createAdminClient();
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([prevPath]);
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: `company_profile.logo_${variant}_remove`,
    before: before as Record<string, unknown> | null,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ profile: data });
}
