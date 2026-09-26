import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (payload.category === "task_activity") updates.task_activity = false;
  else if (payload.category === "task_reminders") updates.reminders = false;
  else if (payload.category === "task_digest") updates.digest_frequency = "off";
  else if (payload.category === "membership_updates") updates.membership_updates = false;

  await admin.from("email_preferences").upsert({
    user_id: payload.userId,
    org_id: payload.orgId,
    ...updates,
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem"><h1>Unsubscribed</h1><p>You will no longer receive ${payload.category.replace(/_/g, " ")} emails for this workspace.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
