import { test, expect } from "@playwright/test";
import {
  ORG_ROLES,
  isOrgAdminRole,
  isOrgManagerOrAbove,
  legacyProfileRoleToOrgRole,
} from "../lib/org/roles";

test.describe("multi-tenant role helpers", () => {
  test("legacy admin maps to owner", () => {
    expect(legacyProfileRoleToOrgRole("admin")).toBe(ORG_ROLES.OWNER);
    expect(legacyProfileRoleToOrgRole("super_admin")).toBe(ORG_ROLES.OWNER);
  });

  test("org admin roles", () => {
    expect(isOrgAdminRole(ORG_ROLES.OWNER)).toBe(true);
    expect(isOrgAdminRole(ORG_ROLES.ADMIN)).toBe(true);
    expect(isOrgAdminRole(ORG_ROLES.MANAGER)).toBe(false);
  });

  test("manager or above", () => {
    expect(isOrgManagerOrAbove(ORG_ROLES.MEMBER)).toBe(false);
    expect(isOrgManagerOrAbove(ORG_ROLES.MANAGER)).toBe(true);
  });
});

test.describe("public legal placeholders", () => {
  test("privacy page marks placeholder", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByText("This page is a placeholder.")).toBeVisible();
  });

  test("terms page marks placeholder", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Terms of Service/i })).toBeVisible();
    await expect(page.getByText("This page is a placeholder.")).toBeVisible();
  });
});

test.describe("landing product branding", () => {
  test("home uses TaskApp neutral copy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "TaskApp" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });
});
