import { createAdminClient } from "@/lib/supabase/admin";

export async function writeOrgAuditLog(input: {
  orgId: string;
  actorId: string;
  targetId?: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("organization_audit_log").insert({
      org_id: input.orgId,
      actor_id: input.actorId,
      target_id: input.targetId ?? null,
      action: input.action,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
    });
  } catch {
    // audit optional until migration applied
  }
}

export function isValidOrgMemberRole(role: string) {
  return ["owner", "admin", "manager", "member"].includes(role);
}
