export const MAX_EMAIL_OUTBOX_ATTEMPTS = 5;

export function emailOutboxBackoffMs(attempts: number) {
  return Math.min(60_000 * 2 ** attempts, 30 * 60_000);
}
