/** Build public URL for org branding object: `{orgId}/{file}` in company-branding bucket */
export function getOrgLogoPublicUrl(
  supabaseUrl: string,
  orgId: string | null | undefined,
  logoPath: string | null | undefined
): string | null {
  if (!orgId || !logoPath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  const path = logoPath.includes("/") ? logoPath : `${orgId}/${logoPath}`;
  return `${base}/storage/v1/object/public/company-branding/${path}`;
}
