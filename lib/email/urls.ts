import { getEmailConfig } from "./config";

export function taskUrl(taskId: string) {
  const { appUrl } = getEmailConfig();
  return `${appUrl}/pm/tasks/${taskId}`;
}

export function inviteAcceptUrl(token: string) {
  const { appUrl } = getEmailConfig();
  return `${appUrl}/invite/${token}`;
}
