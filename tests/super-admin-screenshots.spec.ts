import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";

async function ensureDir() {
  fs.mkdirSync(OUT, { recursive: true });
}

async function snap(page: Page, name: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

const SHARE = process.env.VERCEL_SHARE_TOKEN || "";
const BASE =
  process.env.PREVIEW_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000";

async function initShare(page: Page) {
  if (!SHARE) return;
  const origin = new URL(BASE).origin;
  await page.goto(`${origin}/login?_vercel_share=${SHARE}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
}

async function loginAdmin(page: Page) {
  const origin = BASE.replace(/\/$/, "");
  const shareQ = SHARE ? `?_vercel_share=${SHARE}` : "";
  await page.goto(`${origin}/login${shareQ}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.fill("#login", "demo_admin");
  await page.fill("#password", "Demo1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin|pic)/, { timeout: 60000 });
}

test.beforeAll(() => {
  ensureDir();
});

test("super admin UI screenshots", async ({ page }) => {
  await initShare(page);
  const origin = BASE.replace(/\/$/, "");
  const shareQ = SHARE ? `?_vercel_share=${SHARE}` : "";
  await page.goto(`${origin}/login${shareQ}`, { waitUntil: "networkidle" });
  await snap(page, "login-branding-390.png", 390, 844);
  await page.goto(`${BASE.replace(/\/$/, "")}/login`, { waitUntil: "networkidle" });
  await snap(page, "login-branding-1920.png", 1920, 1080);

  test.skip(!SHARE && !process.env.SUPABASE_SERVICE_ROLE_KEY, "Needs VERCEL_SHARE_TOKEN or SUPABASE_SERVICE_ROLE_KEY");

  await loginAdmin(page);

  await page.goto(`${BASE.replace(/\/$/, "")}/dashboard`, { waitUntil: "networkidle" });
  await snap(page, "header-custom-branding-390.png", 390, 844);
  await snap(page, "header-custom-branding-1920.png", 1920, 1080);

  await page.goto(`${BASE.replace(/\/$/, "")}/admin/company`, { waitUntil: "networkidle" });
  await snap(page, "company-profile-logo-preview-390.png", 390, 844);
  await snap(page, "company-profile-390.png", 390, 844);
  await snap(page, "company-profile-1920.png", 1920, 1080);

  await page.goto(`${BASE.replace(/\/$/, "")}/admin/users`, { waitUntil: "networkidle" });
  await snap(page, "user-management-390.png", 390, 844);
  await snap(page, "user-management-1920.png", 1920, 1080);

  await page.getByRole("button", { name: "Add user" }).click();
  await expect(page.getByRole("heading", { name: "Add user" })).toBeVisible();
  await snap(page, "add-user-form-390.png", 390, 844);

  const roleSelect = page.locator("tbody select").first();
  if (await roleSelect.count()) {
    await roleSelect.selectOption("manager");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 }).catch(() => undefined);
    if (await page.getByRole("dialog").isVisible()) {
      await snap(page, "role-change-confirm-390.png", 390, 844);
      await page.getByRole("button", { name: "Cancel" }).click();
    }
  }

  const deactivateBtn = page.getByRole("button", { name: "Deactivate" }).first();
  if (await deactivateBtn.isDisabled()) {
    await snap(page, "last-super-admin-greyed-390.png", 390, 844);
  }
});
