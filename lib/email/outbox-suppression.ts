import type { createAdminClient } from "@/lib/supabase/admin";
import { emailOutboxBackoffMs } from "@/lib/email/retry";
import type { RecipientSuppressionStatus } from "@/lib/email/suppression";

type AdminClient = ReturnType<typeof createAdminClient>;

export type OutboxSuppressionRow = {
  id: string;
  attempts?: number;
};

/** Apply suppression lookup result to an outbox row. Returns whether sending should continue. */
export async function applySuppressionLookupToOutbox(
  admin: AdminClient,
  row: OutboxSuppressionRow,
  status: RecipientSuppressionStatus
): Promise<boolean> {
  if (status === "not_suppressed") return true;

  if (status === "suppressed") {
    await admin
      .from("email_outbox")
      .update({ status: "suppressed", error: "recipient_suppressed" })
      .eq("id", row.id);
    return false;
  }

  const attempts = (row.attempts ?? 0) + 1;
  const retryAt = new Date(Date.now() + emailOutboxBackoffMs(attempts)).toISOString();
  await admin
    .from("email_outbox")
    .update({
      status: "pending",
      attempts,
      error: "suppression_lookup_failed",
      send_after: retryAt,
    })
    .eq("id", row.id);
  return false;
}
