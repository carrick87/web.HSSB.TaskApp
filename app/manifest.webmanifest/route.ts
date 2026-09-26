import { NextResponse } from "next/server";
import { getPublicCompanyProfile, getCompanyLogoPublicUrl } from "@/lib/company/profile";

export async function GET() {
  const company = await getPublicCompanyProfile();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoUrl = getCompanyLogoPublicUrl(supabaseUrl, company.logo_path);

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      ]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  return NextResponse.json({
    name: company.name,
    short_name: company.short_name || company.name,
    description: company.tagline ?? "Internal task management",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    theme_color: "#0052CC",
    background_color: "#F7F8F9",
    orientation: "portrait-primary",
    icons,
    categories: ["productivity", "business"],
    lang: "en",
    dir: "ltr",
  });
}
