import { NextResponse } from "next/server";
import { getOrgApiContext } from "@/lib/org/api-auth";
import { writeOrgAuditLog } from "@/lib/org/audit";
import { COMPANY_LOGO_BUCKET, type LogoVariant } from "@/lib/company/constants";
import { validateLogoUpload } from "@/lib/company/validate-logo";
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

function storagePath(orgId: string, fileName: string) {
  return `${orgId}/${fileName}`;
}

export async function POST(request: Request) {
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.orgId === "legacy") {
    return NextResponse.json({ error: "Organization migration required." }, { status: 503 });
  }

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
  const validation = await validateLogoUpload({ type: file.type, size: file.size }, bytes, variant);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type === "image/jpeg" ? "jpg" : "png";
  const fileName = `logo-${variant}-${Date.now()}.${ext}`;
  const path = storagePath(ctx.orgId, fileName);
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("organizations").select("*").eq("id", ctx.orgId).single();

  const column = COLUMN[variant];
  const { data, error } = await supabase
    .from("organizations")
    .update({ [column]: fileName })
    .eq("id", ctx.orgId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prevPath = before?.[column] as string | null | undefined;
  if (prevPath) {
    const prevStorage = prevPath.includes("/") ? prevPath : storagePath(ctx.orgId, prevPath);
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([prevStorage]);
  }

  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `organization.logo_${variant}_upload`,
    before: before as Record<string, unknown>,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ organization: data });
}

export async function DELETE(request: Request) {
  const ctx = await getOrgApiContext(true);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.orgId === "legacy") {
    return NextResponse.json({ error: "Organization migration required." }, { status: 503 });
  }

  const url = new URL(request.url);
  const variantParam = url.searchParams.get("variant");
  const variant = variantParam === "wide" || variantParam === "square" ? variantParam : null;
  if (!variant) {
    return NextResponse.json({ error: "Query param variant=wide|square required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("organizations").select("*").eq("id", ctx.orgId).single();

  const column = COLUMN[variant];
  const { data, error } = await supabase
    .from("organizations")
    .update({ [column]: null })
    .eq("id", ctx.orgId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prevPath = before?.[column] as string | null | undefined;
  if (prevPath) {
    const admin = createAdminClient();
    const prevStorage = prevPath.includes("/") ? prevPath : storagePath(ctx.orgId, prevPath);
    await admin.storage.from(COMPANY_LOGO_BUCKET).remove([prevStorage]);
  }

  await writeOrgAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `organization.logo_${variant}_remove`,
    before: before as Record<string, unknown>,
    after: data as Record<string, unknown>,
  });

  return NextResponse.json({ organization: data });
}
