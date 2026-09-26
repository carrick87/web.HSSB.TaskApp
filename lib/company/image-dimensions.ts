import sharp from "sharp";
import { COMPANY_SQUARE_LOGO_MIN_PX } from "./constants";

export async function validateSquareLogoDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/svg+xml") {
    return { ok: true as const };
  }
  try {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < COMPANY_SQUARE_LOGO_MIN_PX || h < COMPANY_SQUARE_LOGO_MIN_PX) {
      return {
        error: `Square logo must be at least ${COMPANY_SQUARE_LOGO_MIN_PX}×${COMPANY_SQUARE_LOGO_MIN_PX} pixels (this image is ${w}×${h}).`,
      } as const;
    }
    return { ok: true as const };
  } catch {
    return { error: "Could not read image dimensions." } as const;
  }
}
