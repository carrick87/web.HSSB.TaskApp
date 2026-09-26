import { COMPANY_NAME_MAX_LENGTH, COMPANY_SHORT_NAME_MAX_LENGTH } from "@/lib/company/constants";

export function validateOrganizationPayload(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > COMPANY_NAME_MAX_LENGTH) {
    return { error: `Organization name is required (max ${COMPANY_NAME_MAX_LENGTH} characters).` } as const;
  }
  const short_name =
    typeof body.short_name === "string" && body.short_name.trim()
      ? body.short_name.trim().slice(0, COMPANY_SHORT_NAME_MAX_LENGTH)
      : null;

  const optionalText = (key: string, max = 500) =>
    typeof body[key] === "string" && body[key].trim() ? String(body[key]).trim().slice(0, max) : null;

  const email = optionalText("email", 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address." } as const;
  }
  const website = optionalText("website", 200);
  if (website && !/^https?:\/\//i.test(website)) {
    return { error: "Website must start with http:// or https://" } as const;
  }

  return {
    data: {
      name,
      short_name,
      registration_no: optionalText("registration_no", 80),
      address: optionalText("address", 500),
      phone: optionalText("phone", 40),
      email,
      website,
    },
  } as const;
}
