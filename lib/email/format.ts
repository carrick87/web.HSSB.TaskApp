export type DateFormatPref = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/** Product label in email From headers when EMAIL_FROM has no display name. */
export const EMAIL_PRODUCT_NAME_FALLBACK = "HAR TaskApp";

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
  return orgName.replace(/[\r\n]+/g, " ").replace(/[<>"]/g, "").trim();
}

/** Quote a display-name atom per RFC 5322 when it contains specials. */
export function quoteRfc5322DisplayNameAtom(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '""';
  const needsQuotes = /[,;\\"]/.test(trimmed) || /[^\x20-\x7E]/.test(trimmed);
  if (!needsQuotes) return trimmed;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildWorkspaceFromHeader(orgName: string, emailFromEnv: string) {
  const { email } = parseFromAddress(emailFromEnv);
  const productName = emailProductDisplayName(emailFromEnv);
  const org = quoteRfc5322DisplayNameAtom(sanitizeOrgNameForHeader(orgName));
  const displayName = `${org} via ${productName}`;
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
