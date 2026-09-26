/**
 * Product branding (global). Workspace logos are separate — header + invite/login only.
 * Change PRODUCT_NAME when marketing finalizes the name.
 */
export const PRODUCT_NAME = "TaskApp";
export const PRODUCT_SHORT_NAME = "TaskApp";
export const PRODUCT_TAGLINE = "Task management for teams";

export const PRODUCT_ICON_PATHS = {
  favicon32: "/icons/favicon-32x32.png",
  favicon16: "/icons/favicon-16x16.png",
  appleTouch: "/icons/apple-touch-icon.png",
  pwa192: "/icons/icon-192.png",
  pwa512: "/icons/icon-512.png",
  maskable192: "/icons/icon-maskable-192.png",
  maskable512: "/icons/icon-maskable-512.png",
} as const;

export const PRODUCT_THEME_COLOR = "#0052CC";
export const PRODUCT_BACKGROUND_COLOR = "#F7F8F9";

/** Fallback postal address in email footers when org has none. */
export const PRODUCT_POSTAL_ADDRESS =
  "TaskApp · Level 1, Example Tower, 123 Example Street, Kuala Lumpur, Malaysia";

export function productPageTitle(suffix?: string) {
  if (!suffix) return PRODUCT_NAME;
  return `${PRODUCT_NAME} — ${suffix}`;
}
