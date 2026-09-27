import type { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmailAddress } from "@/lib/email/address";

type AdminClient = ReturnType<typeof createAdminClient>;

export type RecipientSuppressionStatus = "suppressed" | "not_suppressed" | "unknown";

export async function lookupRecipientSuppression(
  admin: AdminClient,
  recipientEmail: string
): Promise<RecipientSuppressionStatus> {
  const email = normalizeEmailAddress(recipientEmail.trim());
  if (!email) return "not_suppressed";

  const { data: authRow, error: authError } = await admin
    .from("profiles")
    .select("id")
    .eq("email_suppressed", true)
    .eq("auth_email", email)
    .limit(1)
    .maybeSingle();
  if (authError) return "unknown";
  if (authRow) return "suppressed";

  const { data: harrisonRow, error: harrisonError } = await admin
    .from("profiles")
    .select("id")
    .eq("email_suppressed", true)
    .eq("harrison_email", email)
    .limit(1)
    .maybeSingle();
  if (harrisonError) return "unknown";
  if (harrisonRow) return "suppressed";
  return "not_suppressed";
}
