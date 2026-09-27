import { normalizeEmailAddress } from "@/lib/email/address";

/** Lowercase Harrison contact email for temp-password members (profile harrison_email). */
export function tempPasswordHarrisonEmail(email: unknown): string | null {
  if (email == null || !String(email).trim()) return null;
  return normalizeEmailAddress(String(email));
}
