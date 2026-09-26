import type { CompanyProfile } from "@/lib/company/constants";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";
import Image from "next/image";

type Props = {
  company: Pick<CompanyProfile, "name" | "short_name" | "logo_wide_path">;
  /** Unsaved form values for live preview */
  previewName?: string;
  previewShortName?: string;
  previewWidePath?: string | null;
};

export function MockTopBarPreview({
  company,
  previewName,
  previewShortName,
  previewWidePath,
}: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const name = previewName ?? company.name;
  const shortName = previewShortName?.trim() || previewShortName === "" ? previewShortName : company.short_name;
  const displayShort = shortName?.trim() || name;
  const widePath = previewWidePath !== undefined ? previewWidePath : company.logo_wide_path;
  const logoUrl = getCompanyLogoPublicUrl(supabaseUrl, widePath);
  const initials = (shortName?.trim() || name || "TA").slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-atlassian border border-neutral-200 overflow-hidden mx-auto"
      style={{ width: 390, maxWidth: "100%" }}
    >
      <p className="text-xs text-neutral-700 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        Phone top bar preview (390px)
      </p>
      <div
        className="flex items-center gap-2 px-3 h-14 bg-white"
        style={{ borderBottom: "1px solid #DFE1E6" }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={120}
            height={32}
            className="h-8 w-auto max-w-[120px] object-contain flex-shrink-0"
            unoptimized
          />
        ) : (
          <div className="h-8 w-10 bg-brand-700 rounded-atlassian flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
        )}
        <span
          className="font-medium text-sm truncate min-w-0 flex-1"
          style={{ color: "#172B4D" }}
          title={displayShort}
        >
          {displayShort}
        </span>
      </div>
    </div>
  );
}
