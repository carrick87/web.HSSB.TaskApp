import crypto from "crypto";
import { getEmailConfig } from "./config";

export type UnsubscribePayload = {
  userId: string;
  orgId: string;
  category: string;
  exp: number;
};

export function signUnsubscribeToken(payload: UnsubscribePayload): string {
  const { signingSecret } = getEmailConfig();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", signingSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  const { signingSecret } = getEmailConfig();
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", signingSecret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UnsubscribePayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(userId: string, orgId: string, category: string) {
  const { appUrl } = getEmailConfig();
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 365;
  const token = signUnsubscribeToken({ userId, orgId, category, exp });
  return `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
