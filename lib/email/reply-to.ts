const SIMPLE_EMAIL = /^[^\s@,<>][^\s,<>]*@[^\s@,<>]+\.[^\s@,<>]+$/;
const RAW_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

/** Single RFC-like mailbox for Reply-To from organization contact email. */
export function parseOrganizationReplyTo(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  if (RAW_CONTROL_CHARS.test(raw)) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || /[\s,<>]/.test(trimmed)) return undefined;
  if (!SIMPLE_EMAIL.test(trimmed)) return undefined;
  return trimmed;
}
