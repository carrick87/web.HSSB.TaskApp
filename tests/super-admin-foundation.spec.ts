import { test, expect } from "@playwright/test";
import { validateCompanyPayload } from "../lib/company/validate";
import { validateLogoUploadMeta } from "../lib/company/validate-logo";
import { COMPANY_LOGO_MAX_BYTES } from "../lib/company/constants";
import {
  isSuperAdmin,
  isManagerOrAbove,
  normalizeProfileRole,
  ROLES,
} from "../lib/roles";

test.describe("role helpers", () => {
  test("maps legacy admin to super_admin", () => {
    expect(normalizeProfileRole("admin")).toBe(ROLES.SUPER_ADMIN);
    expect(isSuperAdmin("admin")).toBe(true);
  });

  test("maps legacy pic to manager", () => {
    expect(normalizeProfileRole("pic")).toBe(ROLES.MANAGER);
    expect(isManagerOrAbove("pic")).toBe(true);
    expect(isSuperAdmin("pic")).toBe(false);
  });

  test("staff user is not elevated", () => {
    expect(normalizeProfileRole("staff")).toBe(ROLES.USER);
    expect(isManagerOrAbove("staff")).toBe(false);
  });
});

test.describe("company validation", () => {
  test("requires company name", () => {
    const result = validateCompanyPayload({ name: "" });
    expect(result).toHaveProperty("error");
  });

  test("rejects invalid website", () => {
    const result = validateCompanyPayload({ name: "Acme", website: "not-a-url" });
    expect(result).toHaveProperty("error");
  });

  test("logo mime and size", () => {
    expect(validateLogoUploadMeta({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateLogoUploadMeta({ type: "image/webp", size: 1000 }).error).toBeTruthy();
    expect(
      validateLogoUploadMeta({ type: "image/png", size: COMPANY_LOGO_MAX_BYTES + 1 }).error
    ).toBeTruthy();
  });

  test("short name max length", () => {
    const long = "a".repeat(31);
    const result = validateCompanyPayload({ name: "Acme", short_name: long });
    if ("data" in result) {
      expect(result.data.short_name?.length).toBeLessThanOrEqual(30);
    }
  });
});

test.describe("UI role gating", () => {
  test("non-super-admin cannot access admin company page", async ({ page }) => {
    test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY for username login");

    await page.goto("/login", { waitUntil: "networkidle" });
    await page.fill("#login", "demo_member1");
    await page.fill("#password", "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 60000 });
    await page.goto("/admin/company");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("login page shows company branding text", async ({ page }) => {
    const base = (process.env.BASE_URL || "http://localhost:3001").replace(/\/$/, "");
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await expect(page.getByText("TaskApp", { exact: false }).first()).toBeVisible();
  });
});
