import { test, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/gap-fix';
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

test.describe('Mobile Gap Investigation - Before Fix', () => {
  const viewports = [
    { width: 375, height: 667, name: '375x667' },
    { width: 390, height: 844, name: '390x844' },
    { width: 430, height: 932, name: '430x932' },
  ];

  for (const vp of viewports) {
    test(`Dashboard at ${vp.name} - BEFORE`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      await initContext(context);
      const page = await context.newPage();

      const loggedIn = await login(page, 'demo_manager');
      test.skip(!loggedIn, 'Login failed');

      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await screenshot(page, `dashboard-${vp.name}-before.png`);

      // Also measure the gap
      const header = page.locator('header.lg\\:hidden');
      const mainContent = page.locator('main.main-content');
      const pageHeading = page.locator('h1, h2').first();

      const headerBox = await header.boundingBox();
      const mainBox = await mainContent.boundingBox();
      const headingBox = await pageHeading.boundingBox();

      console.log(`\n=== ${vp.name} measurements ===`);
      console.log(`Header: y=${headerBox?.y}, height=${headerBox?.height}, bottom=${headerBox ? headerBox.y + headerBox.height : 'N/A'}`);
      console.log(`Main content: y=${mainBox?.y}`);
      console.log(`Page heading: y=${headingBox?.y}`);
      if (headerBox && headingBox) {
        console.log(`Gap from header bottom to heading: ${headingBox.y - (headerBox.y + headerBox.height)}px`);
      }

      await context.close();
    });

    test(`Task detail at ${vp.name} - BEFORE`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      await initContext(context);
      const page = await context.newPage();

      const loggedIn = await login(page, 'demo_manager');
      test.skip(!loggedIn, 'Login failed');

      // Navigate to a task detail page
      await page.goto('/pm/tasks/f0000000-0000-0000-0000-000000000003', { waitUntil: 'networkidle', timeout: 30000 });
      await screenshot(page, `task-detail-${vp.name}-before.png`);

      await context.close();
    });
  }

  // Also test standalone mode
  test(`Dashboard at 390x844 standalone - BEFORE`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      // Simulate standalone PWA mode
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    
    // Add display-mode: standalone media query simulation
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('display-mode: standalone'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    });

    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, `dashboard-390x844-standalone-before.png`);

    await context.close();
  });

  // Verify desktop is unchanged
  test(`Desktop at 1024 - BEFORE`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, `dashboard-1024-before.png`);

    await context.close();
  });

  test(`Desktop at 1920 - BEFORE`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, `dashboard-1920-before.png`);

    await context.close();
  });
});
