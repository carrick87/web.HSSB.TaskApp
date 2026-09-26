import { PRODUCT_NAME } from "@/src/config/product";

export type DateFormatPref = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export function localeForDateFormat(format: string) {
  if (format === "MM/DD/YYYY") return "en-US";
  if (format === "YYYY-MM-DD") return "sv-SE";
  return "en-GB";
}

export function formatDateInTimezone(
  iso: string | Date | null | undefined,
  timeZone: string,
  dateFormat: string
) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const locale = localeForDateFormat(dateFormat);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTimeInTimezone(
  iso: string | Date,
  timeZone: string,
  dateFormat: string
) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const locale = localeForDateFormat(dateFormat);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Parse `Name <email@domain>` or bare email from EMAIL_FROM. */
export function parseFromAddress(from: string) {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: PRODUCT_NAME, email: from.trim() };
}

export function buildWorkspaceFromHeader(orgName: string, emailFromEnv: string) {
  const { email } = parseFromAddress(emailFromEnv);
  const displayName = `${orgName} via ${PRODUCT_NAME}`;
  return `${displayName} <${email}>`;
}

export function mailDomainFromFrom(emailFromEnv: string) {
  const { email } = parseFromAddress(emailFromEnv);
  const part = email.split("@")[1];
  return part ?? "notifications.local";
}

export function taskThreadRootMessageId(taskId: string, domain: string) {
  return `<task-${taskId}@${domain}>`;
}

export function outboundMessageId(outboxId: string, domain: string) {
  return `<send-${outboxId}@${domain}>`;
}
