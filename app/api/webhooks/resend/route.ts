import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailConfig } from "@/lib/email/config";
import {
  extractResendWebhookRecipientEmails,
  suppressProfilesForEmail,
} from "@/lib/email/resend-webhook";

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
  const expectedBuf = Buffer.from(expected);
  for (const part of signature.split(" ")) {
    const sigValue = part.split(",")[1];
    if (!sigValue) continue;
    try {
      const sigBuf = Buffer.from(sigValue);
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
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

  let body: { type?: string; data?: { email?: string; to?: string | string[]; bounce?: { type?: string } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emails = extractResendWebhookRecipientEmails(body.data);
  if (!emails.length) return NextResponse.json({ ok: true });

  if (body.type === "email.bounced" || body.type === "email.complained") {
    const admin = createAdminClient();
    await suppressProfilesForEmail(admin, emails, body.type);
  }

  return NextResponse.json({ ok: true });
}
