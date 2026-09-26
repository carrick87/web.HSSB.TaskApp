import {
  ALLOWED_LOGO_MIME_TYPES,
  COMPANY_LOGO_MAX_BYTES,
} from "./constants";

export function validateLogoUpload(file: { type: string; size: number }) {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
    return { error: "Logo must be PNG, JPG, WebP, or SVG." } as const;
  }
  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return { error: "Logo must be 2 MB or smaller." } as const;
  }
  return { ok: true as const };
}
