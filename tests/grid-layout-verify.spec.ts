import { test, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/grid-layout';
const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN || '';

async function initContext(context: BrowserContext): Promise<void> {
  if (SHARE_TOKEN) {
    const page = await context.newPage();
    await page.goto(`/?_vercel_share=${SHARE_TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.close();
  }
}

async function login(page: Page, username: string): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.fill('#login', username);
    await page.fill('#password', 'Demo1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    return true;
  } catch (e) {
    console.error(`Login failed for ${username}:`, e);
    return false;
  }
}

async function screenshot(page: Page, filename: string): Promise<void> {
  await page.waitForTimeout(500);
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`Saved: ${filename}`);
}

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

// Test at breakpoint boundary to verify clean collapse
test.describe('CSS Grid Layout Verification', () => {
  const viewports = [
    { width: 1023, height: 768, name: 'below-breakpoint-1023' },
    { width: 1024, height: 768, name: 'at-breakpoint-1024' },
    { width: 1280, height: 800, name: 'desktop-1280' },
    { width: 1440, height: 900, name: 'desktop-1440' },
    { width: 1920, height: 1080, name: 'desktop-1920' },
  ];

  for (const vp of viewports) {
    test(`Dashboard at ${vp.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      await initContext(context);
      const page = await context.newPage();

      const loggedIn = await login(page, 'demo_manager');
      test.skip(!loggedIn, 'Login failed');

      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await screenshot(page, `dashboard-${vp.name}.png`);

      await context.close();
    });
  }
});
