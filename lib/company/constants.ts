export const DEFAULT_COMPANY = {
  name: "TaskApp",
  short_name: "TaskApp",
  tagline: "Harrison Sabah Sdn Bhd",
  logo_path: null as string | null,
  registration_no: null as string | null,
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  website: null as string | null,
};

export type CompanyProfile = typeof DEFAULT_COMPANY & {
  updated_at?: string | null;
  updated_by?: string | null;
};

export const COMPANY_LOGO_BUCKET = "company-branding";
export const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const COMPANY_NAME_MAX_LENGTH = 80;

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;
