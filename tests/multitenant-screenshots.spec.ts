import { test, expect } from "@playwright/test";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";

async function shot(page: import("@playwright/test").Page, name: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

test.describe("multi-tenant UI screenshots", () => {
  test("capture public and settings shells", async ({ page }) => {
    await shot(page, "multitenant-landing-390.png", 390, 844);
    await page.goto("/");
    await shot(page, "multitenant-landing-390.png", 390, 844);

    await page.goto("/login?mode=signup");
    await shot(page, "multitenant-signup-390.png", 390, 844);

    await page.goto("/onboarding/create-org");
    await shot(page, "multitenant-onboarding-create-org-390.png", 390, 844);

    await page.goto("/privacy");
    await shot(page, "multitenant-privacy-390.png", 390, 800);

    await page.goto("/settings/organization");
    await shot(page, "multitenant-org-settings-1920.png", 1920);
    await shot(page, "multitenant-org-settings-390.png", 390, 844);

    await page.goto("/settings/members");
    await shot(page, "multitenant-members-1920.png", 1920);
    await shot(page, "multitenant-members-390.png", 390, 844);

    await page.goto("/settings/account");
    await shot(page, "multitenant-delete-account-390.png", 390, 844);

    await page.goto("/platform");
    await shot(page, "multitenant-platform-1920.png", 1920);
  });
});

test("login neutral branding", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("TaskApp")).toBeVisible();
  await shot(page, "multitenant-login-product-brand-390.png", 390, 844);
});
