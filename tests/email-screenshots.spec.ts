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
  width: number,
  colorScheme: "light" | "dark"
) {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width, height: 900 });
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: path.join(OUT, name) });
}

test.describe("email template screenshots", () => {
  test.setTimeout(300_000);
  test("render templates and settings in light and dark", async ({ page }) => {
    await page.goto("/email-preview?secret=preview-secret");
    await page.waitForSelector("#workspace_invite");

    for (const mode of ["light", "dark"] as const) {
      for (const key of TEMPLATES) {
        await shotSection(page, key, `email-${key}-${mode}-1200.png`, 1200, mode);
        await shotSection(page, key, `email-${key}-${mode}-390.png`, 390, mode);
      }

      await page.emulateMedia({ colorScheme: mode });
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.locator("#notification-settings").scrollIntoViewIfNeeded();
      await page.locator("#notification-settings").screenshot({
        path: path.join(OUT, `notifications-settings-grid-${mode}-1200.png`),
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#notification-settings").screenshot({
        path: path.join(OUT, `notifications-settings-grid-${mode}-390.png`),
      });
    }
  });
});
