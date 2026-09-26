import { NextResponse } from "next/server";
import { getActiveOrgCompanyProfile } from "@/lib/company/profile";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveOrganization } from "@/lib/org/context";
import { getOrgLogoPublicUrl } from "@/lib/org/logo-url";

export async function GET() {
  const profile = await getCurrentProfile();
  let company = await getActiveOrgCompanyProfile();
  let orgId: string | undefined;
  if (profile?.current_org_id) {
    const active = await getActiveOrganization(profile.id, profile.current_org_id);
    if (active) orgId = active.org.id;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const squareUrl = orgId
    ? getOrgLogoPublicUrl(supabaseUrl, orgId, company.logo_square_path)
    : getCompanyLogoPublicUrl(supabaseUrl, company.logo_square_path);

  const icons = squareUrl
    ? [
        { src: squareUrl, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: squareUrl, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: squareUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
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
    description: company.tagline ?? "Task management for teams",
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
