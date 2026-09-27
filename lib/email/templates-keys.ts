export const EMAIL_TEMPLATES = {
  WORKSPACE_INVITE: "workspace_invite",
  INVITE_ACCEPTED: "invite_accepted",
  ROLE_CHANGED: "role_changed",
  REMOVED_FROM_WORKSPACE: "removed_from_workspace",
  WELCOME_WORKSPACE: "welcome_workspace",
  TASK_ACTIVITY: "task_activity",
  TASK_REMINDERS: "task_reminders",
  TASK_DIGEST: "task_digest",
  ACCOUNT_DELETED: "account_deleted",
  WORKSPACE_SUSPENDED: "workspace_suspended",
  WORKSPACE_REACTIVATED: "workspace_reactivated",
} as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

/** Mandatory emails ignore preferences and unsubscribe (except List-Unsubscribe still present for compliance on some). */
export const MANDATORY_TEMPLATES = new Set<string>([
  EMAIL_TEMPLATES.WORKSPACE_INVITE,
  EMAIL_TEMPLATES.WELCOME_WORKSPACE,
  EMAIL_TEMPLATES.ACCOUNT_DELETED,
  EMAIL_TEMPLATES.WORKSPACE_SUSPENDED,
  EMAIL_TEMPLATES.WORKSPACE_REACTIVATED,
]);

export const TASK_ACTIVITY_BATCH_DELAY_MS = 5 * 60 * 1000;

export function taskActivityBatchKey(orgId: string, userId: string, taskId: string) {
  return `task_activity:${orgId}:${userId}:${taskId}`;
}
