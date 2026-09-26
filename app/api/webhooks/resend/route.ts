import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailConfig } from "@/lib/email/config";

function verifySvix(payload: string, secret: string, headers: Headers) {
  const msgId = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!msgId || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSec > 300) return false;

  const signed = `${msgId}.${timestamp}.${payload}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", secretBytes).update(signed).digest("base64");
  return signature.split(" ").some((part) => part.split(",")[1] === expected);
}

export async function POST(request: Request) {
  const { webhookSecret } = getEmailConfig();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifySvix(raw, webhookSecret, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { type?: string; data?: { email?: string; bounce?: { type?: string } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.data?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: true });

  if (body.type === "email.bounced" || body.type === "email.complained") {
    const admin = createAdminClient();
    const patch = {
      email_suppressed: true,
      email_suppression_reason: body.type,
    };
    await admin.from("profiles").update(patch).eq("auth_email", email);
    await admin.from("profiles").update(patch).eq("harrison_email", email);
  }

  return NextResponse.json({ ok: true });
}
