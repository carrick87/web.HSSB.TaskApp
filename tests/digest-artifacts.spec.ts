import { test } from "@playwright/test";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";
const EMAILS = "/opt/cursor/artifacts/emails";

test.describe("digest email artifacts", () => {
  test("screenshot rendered digest HTML in light and dark", async ({ page }) => {
    test.setTimeout(60_000);

    for (const mode of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: mode });
      await page.setViewportSize({ width: 390, height: 1200 });
      const file =
        mode === "light"
          ? path.join(EMAILS, "digest-light.html")
          : path.join(EMAILS, "digest-dark-forced.html");
      await page.goto(`file://${file}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: path.join(OUT, `digest-${mode}-390.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.screenshot({
        path: path.join(OUT, `digest-${mode}-1200.png`),
        fullPage: true,
      });
    }
  });
});
