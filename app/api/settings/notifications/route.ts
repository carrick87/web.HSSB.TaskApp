import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgApiContext } from "@/lib/org/api-auth";

function mapDbToClient(row: Record<string, unknown> | null) {
  const r = row ?? {};
  return {
    pause_all: r.pause_all === true,
    digest_frequency: (r.digest_frequency as string) ?? "off",
    email_invites: true,
    email_task_activity: r.task_activity !== false,
    email_reminders: r.reminders !== false,
    email_security: true,
    in_app_invites: r.in_app_invites !== false,
    in_app_task_activity: r.in_app_task_activity !== false,
    in_app_reminders: r.in_app_reminders !== false,
    in_app_security: true,
    membership_updates: r.membership_updates !== false,
    task_activity: r.task_activity !== false,
    reminders: r.reminders !== false,
  };
}

export async function GET() {
  const ctx = await getOrgApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, date_format")
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
    date_format: profile?.date_format ?? "DD/MM/YYYY",
    preferences: mapDbToClient(prefs as Record<string, unknown> | null),
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
  if (typeof body.date_format === "string" && body.date_format.trim()) {
    await supabase.from("profiles").update({ date_format: body.date_format.trim() }).eq("id", ctx.userId);
  }

  const digest = body.digest_frequency;
  const validDigest = digest === "daily" || digest === "weekly" || digest === "off" ? digest : "off";

  const updates = {
    user_id: ctx.userId,
    org_id: ctx.orgId,
    pause_all: body.pause_all === true,
    task_activity: body.email_task_activity !== false,
    reminders: body.email_reminders !== false,
    membership_updates: body.in_app_invites !== false,
    digest_frequency: validDigest,
    in_app_task_activity: body.in_app_task_activity !== false,
    in_app_reminders: body.in_app_reminders !== false,
    in_app_membership: body.in_app_invites !== false,
    in_app_invites: body.in_app_invites !== false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("email_preferences").upsert(updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences: mapDbToClient(updates as unknown as Record<string, unknown>) });
}
