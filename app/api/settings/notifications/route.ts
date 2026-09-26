import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgApiContext } from "@/lib/org/api-auth";

export async function GET() {
  const ctx = await getOrgApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", ctx.userId)
    .single();

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  return NextResponse.json({
    timezone: profile?.timezone ?? "Asia/Kuching",
    preferences: prefs ?? {
      task_activity: true,
      reminders: true,
      digest_frequency: "off",
      membership_updates: true,
    },
  });
}

export async function PUT(request: Request) {
  const ctx = await getOrgApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();

  if (typeof body.timezone === "string" && body.timezone.trim()) {
    await supabase.from("profiles").update({ timezone: body.timezone.trim() }).eq("id", ctx.userId);
  }

  const digest = body.digest_frequency;
  const validDigest = digest === "daily" || digest === "weekly" || digest === "off" ? digest : undefined;

  const updates = {
    user_id: ctx.userId,
    org_id: ctx.orgId,
    task_activity: body.task_activity !== false,
    reminders: body.reminders !== false,
    membership_updates: body.membership_updates !== false,
    digest_frequency: validDigest ?? "off",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("email_preferences").upsert(updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences: updates });
}
