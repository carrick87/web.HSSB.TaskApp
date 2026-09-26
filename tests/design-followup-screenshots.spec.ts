import { test, expect } from "@playwright/test";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";

async function shot(page: import("@playwright/test").Page, name: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

test.describe("design follow-up screenshots", () => {
  test("onboarding steps and public shells", async ({ page }) => {
    await page.goto("/login?mode=signup");
    await shot(page, "onboarding-step1-signup-390.png", 390, 844);

    await page.goto("/onboarding/workspace");
    await shot(page, "onboarding-step2-workspace-390.png", 390, 844);

    await page.goto("/onboarding/invite");
    await shot(page, "onboarding-step3-invite-390.png", 390, 844);
  });

  test("offline page", async ({ page }) => {
    await page.goto("/offline.html");
    await shot(page, "offline-screen-390.png", 390, 844);
  });

  test("mobile tab bar shell", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await shot(page, "product-login-390.png", 390, 844);
  });
});
