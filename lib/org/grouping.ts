import type { Organization } from "@/lib/org/constants";

export type GroupingLabels = {
  tier1: string;
  tier2: string;
  hideTier1: boolean;
  hideTier2: boolean;
};

const DEFAULTS: GroupingLabels = {
  tier1: "Team",
  tier2: "Sub-team",
  hideTier1: false,
  hideTier2: true,
};

export function groupingFromOrganization(org: Organization & Partial<GroupingLabels> & Record<string, unknown>): GroupingLabels {
  return {
    tier1: (org.group_tier1_label as string) || DEFAULTS.tier1,
    tier2: (org.group_tier2_label as string) || DEFAULTS.tier2,
    hideTier1: Boolean(org.hide_group_tier1 ?? DEFAULTS.hideTier1),
    hideTier2: Boolean(org.hide_group_tier2 ?? DEFAULTS.hideTier2),
  };
}

export function groupingPayloadFromForm(form: {
  group_tier1_label?: string;
  group_tier2_label?: string;
  hide_group_tier1?: boolean;
  hide_group_tier2?: boolean;
}) {
  return {
    group_tier1_label: form.group_tier1_label?.trim() || DEFAULTS.tier1,
    group_tier2_label: form.group_tier2_label?.trim() || DEFAULTS.tier2,
    hide_group_tier1: !!form.hide_group_tier1,
    hide_group_tier2: !!form.hide_group_tier2,
  };
}
