const RAW_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const LOCAL_PART = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/** Strict single mailbox address (lowercase); rejects PostgREST-unsafe patterns like `*`. */
export function isValidEmailAddress(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (/[\s,*<>]/.test(email)) return false;

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (!LOCAL_PART.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/i.test(tld)) return false;
  for (const label of labels) {
    if (!label.length || !DOMAIN_LABEL.test(label)) return false;
  }

  return true;
}

export function normalizeEmailAddress(raw: string): string | null {
  if (RAW_CONTROL_CHARS.test(raw)) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (!isValidEmailAddress(lower)) return null;
  return lower;
}
