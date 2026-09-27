import type { CompanyProfile } from "@/lib/company/constants";
import { DEFAULT_COMPANY } from "@/lib/company/constants";
import type { Organization } from "@/lib/org/constants";
import {
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
} from "@/src/config/product";

export function productBrandAsCompanyProfile(): CompanyProfile {
  return {
    ...DEFAULT_COMPANY,
    name: PRODUCT_NAME,
    short_name: PRODUCT_SHORT_NAME,
    tagline: PRODUCT_TAGLINE,
  };
}

export function organizationToCompanyProfile(org: Organization): CompanyProfile {
  return {
    name: org.name,
    short_name: org.short_name ?? org.name,
    tagline: PRODUCT_TAGLINE,
    logo_wide_path: org.logo_wide_path,
    logo_square_path: org.logo_square_path,
    registration_no: org.registration_no,
    address: org.address,
    phone: org.phone,
    email: org.email,
    website: org.website,
  };
}
