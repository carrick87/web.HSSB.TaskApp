import { NextResponse } from "next/server";
import {
  PRODUCT_BACKGROUND_COLOR,
  PRODUCT_ICON_PATHS,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_THEME_COLOR,
} from "@/src/config/product";

/** Static product PWA manifest — same icon/name for all installs (not per workspace). */
export async function GET() {
  return NextResponse.json({
    name: PRODUCT_NAME,
    short_name: PRODUCT_SHORT_NAME,
    description: PRODUCT_TAGLINE,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    theme_color: PRODUCT_THEME_COLOR,
    background_color: PRODUCT_BACKGROUND_COLOR,
    orientation: "portrait-primary",
    icons: [
      { src: PRODUCT_ICON_PATHS.pwa192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: PRODUCT_ICON_PATHS.pwa512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: PRODUCT_ICON_PATHS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "business"],
    lang: "en",
    dir: "ltr",
  });
}
