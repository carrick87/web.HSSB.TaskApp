import Image from "next/image";
import type { CompanyProfile } from "@/lib/company/constants";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";

type BrandMarkProps = {
  company: CompanyProfile;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
  /** Wide logo for header/login; square uses square asset in a square tile */
  logoVariant?: "wide" | "square";
};

const sizeMap = {
  sm: { box: "w-8 h-8", wideH: "h-8", img: 32 },
  md: { box: "w-8 h-8", wideH: "h-8", img: 32 },
  lg: { box: "w-12 h-12", wideH: "h-10", img: 48 },
};

export function BrandMark({
  company,
  size = "md",
  showName = true,
  nameClassName = "font-semibold",
  logoVariant = "wide",
}: BrandMarkProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const path =
    logoVariant === "square" ? company.logo_square_path : company.logo_wide_path;
  const logoUrl = getCompanyLogoPublicUrl(supabaseUrl, path);
  const dims = sizeMap[size];
  const initials = (company.short_name || company.name || "TA").slice(0, 2).toUpperCase();
  const displayShort = company.short_name?.trim() || company.name;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {logoUrl ? (
        logoVariant === "wide" ? (
          <Image
            src={logoUrl}
            alt={`${company.name} logo`}
            width={160}
            height={40}
            className={`${dims.wideH} w-auto max-w-[140px] object-contain flex-shrink-0`}
            unoptimized
          />
        ) : (
          <Image
            src={logoUrl}
            alt={`${company.name} logo`}
            width={dims.img}
            height={dims.img}
            className={`${dims.box} rounded-atlassian object-contain bg-white border border-neutral-200 flex-shrink-0`}
            unoptimized
          />
        )
      ) : (
        <div
          className={`${logoVariant === "wide" ? dims.wideH + " w-10" : dims.box} bg-brand-700 rounded-atlassian flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-white font-bold text-sm">{initials}</span>
        </div>
      )}
      {showName && (
        <>
          <span
            className={`${nameClassName} truncate hidden lg:inline min-w-0`}
            style={{ color: "#172B4D" }}
          >
            {company.name}
          </span>
          <span
            className={`${nameClassName} truncate lg:hidden min-w-0 max-w-[160px]`}
            style={{ color: "#172B4D" }}
            title={displayShort}
          >
            {displayShort}
          </span>
        </>
      )}
    </div>
  );
}

export function BrandMarkCompact({ company }: { company: CompanyProfile }) {
  return <BrandMark company={company} size="sm" showName={false} logoVariant="wide" />;
}
