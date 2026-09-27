import type { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmailAddress } from "@/lib/email/address";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function isRecipientEmailSuppressed(admin: AdminClient, recipientEmail: string) {
  const email = normalizeEmailAddress(recipientEmail.trim());
  if (!email) return false;

  const { data: authRow, error: authError } = await admin
    .from("profiles")
    .select("id")
    .eq("email_suppressed", true)
    .eq("auth_email", email)
    .limit(1)
    .maybeSingle();
  if (authError) return true;
  if (authRow) return true;

  const { data: harrisonRow, error: harrisonError } = await admin
    .from("profiles")
    .select("id")
    .eq("email_suppressed", true)
    .eq("harrison_email", email)
    .limit(1)
    .maybeSingle();
  if (harrisonError) return true;
  return Boolean(harrisonRow);
}
