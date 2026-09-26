import { test } from "@playwright/test";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";

const TEMPLATES = [
  "workspace_invite",
  "welcome_workspace",
  "invite_accepted",
  "role_changed",
  "removed_from_workspace",
  "task_activity",
  "task_reminders",
  "task_digest",
  "account_deleted",
  "workspace_suspended",
  "workspace_reactivated",
];

async function shotSection(
  page: import("@playwright/test").Page,
  id: string,
  name: string,
  width: number
) {
  await page.setViewportSize({ width, height: 900 });
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: path.join(OUT, name) });
}

test.describe("email template screenshots", () => {
  test("render all templates desktop and mobile", async ({ page }) => {
    await page.goto("/email-preview");
    await page.waitForLoadState("networkidle");

    for (const key of TEMPLATES) {
      await shotSection(page, key, `email-${key}-1200.png`, 1200);
      await shotSection(page, key, `email-${key}-390.png`, 390);
    }

    await page.setViewportSize({ width: 1200, height: 900 });
    await page.locator("#notification-settings").scrollIntoViewIfNeeded();
    await page.locator("#notification-settings").screenshot({
      path: path.join(OUT, "notifications-settings-1200.png"),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#notification-settings").screenshot({
      path: path.join(OUT, "notifications-settings-390.png"),
    });
  });
});
