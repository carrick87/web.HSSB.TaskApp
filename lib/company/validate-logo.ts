import {
  ALLOWED_LOGO_MIME_TYPES,
  COMPANY_LOGO_MAX_BYTES,
  type LogoVariant,
} from "./constants";
import { validateSquareLogoDimensions } from "./image-dimensions";

export function validateLogoUploadMeta(file: { type: string; size: number }) {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
    return { error: "Logo must be PNG, JPG, or SVG." } as const;
  }
  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return { error: "Logo must be 1 MB or smaller." } as const;
  }
  return { ok: true as const };
}

export async function validateLogoUpload(
  file: { type: string; size: number },
  buffer: Buffer,
  variant: LogoVariant
) {
  const meta = validateLogoUploadMeta(file);
  if ("error" in meta) return meta;
  if (variant === "square") {
    return validateSquareLogoDimensions(buffer, file.type);
  }
  return { ok: true as const };
}
