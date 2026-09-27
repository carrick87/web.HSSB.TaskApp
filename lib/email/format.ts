export type DateFormatPref = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/** Product label in email From headers when EMAIL_FROM has no display name. */
export const EMAIL_PRODUCT_NAME_FALLBACK = "HAR TaskApp";

const CONTROL_AND_SEPARATOR_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

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
  return { name: EMAIL_PRODUCT_NAME_FALLBACK, email: from.trim() };
}

/** Display name from EMAIL_FROM (e.g. `HAR TaskApp`); not the workspace suffix. */
export function emailProductDisplayName(emailFromEnv: string) {
  const match = emailFromEnv.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return match[1].trim();
  return EMAIL_PRODUCT_NAME_FALLBACK;
}

export function sanitizeOrgNameForHeader(orgName: string) {
  return orgName
    .replace(CONTROL_AND_SEPARATOR_CHARS, " ")
    .replace(/[<>"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** RFC 5322 quoted-string for a full display name (org via product). */
export function quoteRfc5322DisplayName(displayName: string) {
  return `"${displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildWorkspaceFromHeader(orgName: string, emailFromEnv: string) {
  const { email } = parseFromAddress(emailFromEnv);
  const productName = emailProductDisplayName(emailFromEnv);
  const org = sanitizeOrgNameForHeader(orgName) || "Workspace";
  const displayName = `${org} via ${productName}`;
  return `${quoteRfc5322DisplayName(displayName)} <${email}>`;
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
