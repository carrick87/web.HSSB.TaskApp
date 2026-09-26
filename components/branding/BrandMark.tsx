import Image from "next/image";
import type { CompanyProfile } from "@/lib/company/constants";
import { getCompanyLogoPublicUrl } from "@/lib/company/logo-url";

type BrandMarkProps = {
  company: CompanyProfile;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
};

const sizeMap = {
  sm: { box: "w-8 h-8", text: "text-sm", img: 32 },
  md: { box: "w-8 h-8", text: "text-sm", img: 32 },
  lg: { box: "w-12 h-12", text: "text-2xl", img: 48 },
};

export function BrandMark({
  company,
  size = "md",
  showName = true,
  nameClassName = "font-semibold",
}: BrandMarkProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoUrl = getCompanyLogoPublicUrl(supabaseUrl, company.logo_path);
  const dims = sizeMap[size];
  const initials = (company.short_name || company.name || "TA").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2 min-w-0">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${company.name} logo`}
          width={dims.img}
          height={dims.img}
          className={`${dims.box} rounded-atlassian object-contain bg-white border border-neutral-200 flex-shrink-0`}
          unoptimized
        />
      ) : (
        <div className={`${dims.box} bg-brand-700 rounded-atlassian flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold text-sm">{initials}</span>
        </div>
      )}
      {showName && (
        <span className={`${nameClassName} truncate`} style={{ color: "#172B4D" }}>
          {company.name}
        </span>
      )}
    </div>
  );
}

export function BrandMarkCompact({ company }: { company: CompanyProfile }) {
  return <BrandMark company={company} size="sm" showName={false} />;
}
