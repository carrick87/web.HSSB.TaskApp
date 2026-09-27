export type ResendWebhookEventData = {
  email?: string;
  to?: string | string[];
};

/** Recipient addresses from Resend bounce/complaint payloads (`data.to` array, else `data.email`). */
export function extractResendWebhookRecipientEmails(
  data: ResendWebhookEventData | undefined
): string[] {
  if (!data) return [];

  const fromTo: string[] = [];
  const rawTo = data.to;
  if (Array.isArray(rawTo)) {
    for (const entry of rawTo) {
      if (typeof entry === "string" && entry.trim()) {
        fromTo.push(entry.trim().toLowerCase());
      }
    }
  } else if (typeof rawTo === "string" && rawTo.trim()) {
    fromTo.push(rawTo.trim().toLowerCase());
  }

  if (fromTo.length) return [...new Set(fromTo)];

  const fallback = data.email?.trim().toLowerCase();
  return fallback ? [fallback] : [];
}

import { escapeIlikeExact } from "@/lib/email/suppression";

type ProfileSuppressionClient = {
  from: (table: string) => {
    update: (patch: Record<string, unknown>) => {
      ilike: (column: string, value: string) => unknown;
    };
  };
};

export async function suppressProfilesForEmail(
  admin: ProfileSuppressionClient,
  emails: string[],
  suppressionReason: string
) {
  const patch = {
    email_suppressed: true,
    email_suppression_reason: suppressionReason,
  };
  for (const email of emails) {
    const pattern = escapeIlikeExact(email);
    await admin.from("profiles").update(patch).ilike("auth_email", pattern);
    await admin.from("profiles").update(patch).ilike("harrison_email", pattern);
  }
}
