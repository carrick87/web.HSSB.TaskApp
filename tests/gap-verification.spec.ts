import { test, Page, BrowserContext, expect } from '@playwright/test';
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

test.describe('Mobile Gap Fix - After Screenshots', () => {
  test('Dashboard at 390x844 - AFTER', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-390x844-after.png');

    // Verify gap is now reasonable
    const header = page.locator('header.lg\\:hidden');
    const h1 = page.locator('h1').first();
    const headerBox = await header.boundingBox();
    const h1Box = await h1.boundingBox();
    
    if (headerBox && h1Box) {
      const gap = h1Box.y - headerBox.height;
      console.log(`Gap from header to h1: ${gap}px`);
      expect(gap, 'Gap should be less than 20px').toBeLessThan(20);
    }

    await context.close();
  });

  test('Task detail at 390x844 - AFTER', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    await page.goto('/pm/tasks/f0000000-0000-0000-0000-000000000003', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'task-detail-390x844-after.png');

    await context.close();
  });
});

test.describe('Mobile Gap Verification - All Viewports', () => {
  const mobileViewports = [
    { width: 375, height: 667, name: '375x667' },
    { width: 390, height: 844, name: '390x844' },
    { width: 430, height: 932, name: '430x932' },
  ];

  for (const vp of mobileViewports) {
    test(`Mobile gap test at ${vp.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      await initContext(context);
      const page = await context.newPage();

      const loggedIn = await login(page, 'demo_manager');
      expect(loggedIn).toBe(true);

      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

      const header = page.locator('header.lg\\:hidden');
      const h1 = page.locator('h1').first();
      
      const headerBox = await header.boundingBox();
      const h1Box = await h1.boundingBox();
      
      expect(headerBox).not.toBeNull();
      expect(h1Box).not.toBeNull();
      
      if (headerBox && h1Box) {
        const gap = h1Box.y - headerBox.height;
        console.log(`${vp.name}: Gap = ${gap}px`);
        expect(gap, `Gap at ${vp.name} should be less than 20px`).toBeLessThan(20);
      }

      await context.close();
    });
  }

  // Test standalone PWA mode
  test('Mobile 390x844 standalone mode', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    
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
    expect(loggedIn).toBe(true);

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

    const header = page.locator('header.lg\\:hidden');
    const h1 = page.locator('h1').first();
    
    const headerBox = await header.boundingBox();
    const h1Box = await h1.boundingBox();
    
    if (headerBox && h1Box) {
      const gap = h1Box.y - headerBox.height;
      console.log(`Standalone mode: Gap = ${gap}px`);
      expect(gap, 'Standalone mode gap should be less than 20px').toBeLessThan(20);
    }

    await context.close();
  });
});

test.describe('Desktop Unchanged Verification', () => {
  test('Desktop at 1024 layout unchanged', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    expect(loggedIn).toBe(true);

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-1024-after.png');

    // Verify sidebar is visible and content is to the right
    const sidebar = page.locator('aside.desktop-sidebar');
    const main = page.locator('main.main-content');
    
    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await main.boundingBox();
    
    expect(sidebarBox, 'Desktop sidebar should be visible').not.toBeNull();
    expect(mainBox, 'Main content should be visible').not.toBeNull();
    
    if (sidebarBox && mainBox) {
      expect(mainBox.x, 'Main content should be to the right of sidebar')
        .toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 1);
    }

    await context.close();
  });

  test('Desktop at 1920 layout unchanged', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    expect(loggedIn).toBe(true);

    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-1920-after.png');

    // Verify sidebar is visible and content is to the right
    const sidebar = page.locator('aside.desktop-sidebar');
    const main = page.locator('main.main-content');
    
    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await main.boundingBox();
    
    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    
    if (sidebarBox && mainBox) {
      expect(mainBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 1);
    }

    await context.close();
  });
});
