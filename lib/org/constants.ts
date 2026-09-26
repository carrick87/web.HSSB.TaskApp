export const PRODUCT_BRAND = {
  name: "TaskApp",
  short_name: "TaskApp",
  tagline: "Task management for teams",
};

export type Organization = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_wide_path: string | null;
  logo_square_path: string | null;
  registration_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string;
  group_tier1_label?: string;
  group_tier2_label?: string;
  hide_group_tier1?: boolean;
  hide_group_tier2?: boolean;
};
