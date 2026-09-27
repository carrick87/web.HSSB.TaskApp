import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

export async function writeAuditLog(params: {
  actorId: string;
  targetId?: string | null;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const supabase = await createClient();
  await supabase.from("admin_audit_log").insert({
    actor_id: params.actorId,
    target_id: params.targetId ?? null,
    action: params.action,
    before_data: params.before ?? null,
    after_data: params.after ?? null,
  });
}

export async function listRecentAuditLogs(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, action, before_data, after_data, created_at, actor:profiles!admin_audit_log_actor_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export function isValidAppRole(role: string): role is ProfileRole {
  return role === ROLES.SUPER_ADMIN || role === ROLES.MANAGER || role === ROLES.USER;
}
