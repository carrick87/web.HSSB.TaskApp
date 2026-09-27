import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

function categoryLabel(category: string) {
  return category.replace(/_/g, " ");
}

async function applyUnsubscribe(payload: NonNullable<ReturnType<typeof verifyUnsubscribeToken>>) {
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
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  const label = categoryLabel(payload.category);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;max-width:32rem">
<h1>Unsubscribe from ${label}?</h1>
<p>Confirm to stop ${label} emails for this workspace. Link previews will not unsubscribe you until you confirm.</p>
<form method="POST" action="/api/email/unsubscribe?token=${encodeURIComponent(token)}">
<button type="submit" style="min-height:44px;padding:0.5rem 1rem">Unsubscribe</button>
</form>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  await applyUnsubscribe(payload);

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem"><h1>Unsubscribed</h1><p>You will no longer receive ${categoryLabel(payload.category)} emails for this workspace.</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
