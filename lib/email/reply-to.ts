import { normalizeEmailAddress } from "@/lib/email/address";

/** Single mailbox for Reply-To from organization contact email. */
export function parseOrganizationReplyTo(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  return normalizeEmailAddress(raw) ?? undefined;
}
