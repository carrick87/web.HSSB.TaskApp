import { test, expect } from "@playwright/test";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";
const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const ADMIN_ID = process.env.TEST_AUTH_USER_ID ?? "78925121-0000-4000-8000-000000000001";
const MEMBER_ID = process.env.TEST_AUTH_MEMBER_ID ?? "78925121-0000-4000-8000-000000000006";

async function waitForAppCss(page: import("@playwright/test").Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(
    () => {
      const hasNextCssLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((l) =>
        (l as HTMLLinkElement).href.includes("_next/static/css")
      );
      const hasStyledShell =
        document.querySelector(".app-shell") !== null ||
        document.querySelector("h1.text-xl") !== null;
      const bodyVisible = getComputedStyle(document.body).display !== "none";
      return (hasNextCssLink || hasStyledShell) && bodyVisible;
    },
    undefined,
    { timeout: 60_000 }
  );
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function shot(page: import("@playwright/test").Page, name: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

test.beforeEach(async ({ context }) => {
  const host = new URL(BASE).hostname;
  await context.addCookies([
    {
      name: "test-auth-user",
      value: ADMIN_ID,
      domain: host,
      path: "/",
    },
  ]);
});

test.describe("authenticated UI screenshots", () => {
  test("members and org settings (admin)", async ({ page, context }) => {
    await context.addCookies([
      { name: "test-auth-user", value: ADMIN_ID, domain: new URL(BASE).hostname, path: "/" },
    ]);

    await page.goto(`${BASE}/settings/members`);
    await waitForAppCss(page);
    await expect(page).toHaveURL(/\/settings\/members/);
    await expect(page.getByRole("heading", { name: /members/i })).toBeVisible({ timeout: 20000 });
    await shot(page, "auth-members-1920.png", 1920, 900);
    await shot(page, "auth-members-390.png", 390, 844);

    await page.goto(`${BASE}/settings/organization`);
    await waitForAppCss(page);
    await expect(page).toHaveURL(/\/settings\/organization/);
    await expect(page.getByRole("heading", { name: "Organization", exact: true })).toBeVisible({
      timeout: 20000,
    });
    await shot(page, "auth-org-settings-1920.png", 1920, 900);
    await shot(page, "auth-org-settings-390.png", 390, 844);
  });

  test("empty PM, tab bar, workspace switcher, notifications (member)", async ({ page, context }) => {
    await context.addCookies([
      { name: "test-auth-user", value: MEMBER_ID, domain: new URL(BASE).hostname, path: "/" },
    ]);

    await page.goto(`${BASE}/pm`);
    await waitForAppCss(page);
    await expect(page).toHaveURL(/\/pm/);
    await expect(page.getByRole("heading", { name: "Create your first task" })).toBeVisible({
      timeout: 20000,
    });
    await shot(page, "auth-pm-empty-390.png", 390, 844);

    const tabBar = page.locator("nav").filter({ has: page.getByRole("link", { name: /tasks|home|pm/i }) }).first();
    await expect(tabBar).toBeVisible();
    await tabBar.screenshot({ path: path.join(OUT, "auth-mobile-tab-bar-390.png") });

    const switcher = page.locator('header.lg\\:hidden select[aria-label="Switch workspace"]');
    await switcher.evaluate((el) => {
      const select = el as HTMLSelectElement;
      select.size = Math.min(3, select.options.length);
      select.focus();
    });
    await page.waitForTimeout(200);
    await shot(page, "auth-workspace-switcher-390.png", 390, 844);

    await page.goto(`${BASE}/settings/notifications`);
    await waitForAppCss(page);
    await expect(page.getByRole("heading", { name: /notification/i })).toBeVisible({ timeout: 20000 });
    await shot(page, "auth-notifications-grid-390.png", 390, 844);
  });
});
