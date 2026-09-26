import type { CompanyProfile } from "@/lib/company/constants";
import { DEFAULT_COMPANY } from "@/lib/company/constants";
import type { Organization } from "@/lib/org/constants";
import { PRODUCT_BRAND } from "@/lib/org/constants";

export function productBrandAsCompanyProfile(): CompanyProfile {
  return {
    ...DEFAULT_COMPANY,
    name: PRODUCT_BRAND.name,
    short_name: PRODUCT_BRAND.short_name,
    tagline: PRODUCT_BRAND.tagline,
  };
}

export function organizationToCompanyProfile(org: Organization): CompanyProfile {
  return {
    name: org.name,
    short_name: org.short_name ?? org.name,
    tagline: PRODUCT_BRAND.tagline,
    logo_wide_path: org.logo_wide_path,
    logo_square_path: org.logo_square_path,
    registration_no: org.registration_no,
    address: org.address,
    phone: org.phone,
    email: org.email,
    website: org.website,
  };
}
