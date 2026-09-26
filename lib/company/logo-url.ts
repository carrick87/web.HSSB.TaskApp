/** Client-safe helper: build public URL for a logo object path in company-branding. */
export function getCompanyLogoPublicUrl(
  supabaseUrl: string,
  logoPath: string | null | undefined
): string | null {
  if (!logoPath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/company-branding/${logoPath}`;
}
