import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Escape `%` and `_` for case-insensitive exact `ilike` match. */
export function escapeIlikeExact(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function isRecipientEmailSuppressed(admin: AdminClient, recipientEmail: string) {
  const needle = recipientEmail.trim().toLowerCase();
  if (!needle) return false;
  const pattern = escapeIlikeExact(needle);
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email_suppressed", true)
    .or(`auth_email.ilike.${pattern},harrison_email.ilike.${pattern}`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
