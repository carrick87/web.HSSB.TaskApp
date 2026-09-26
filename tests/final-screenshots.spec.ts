import { test, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/final2';
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

test.describe('Final Screenshots - Desktop 1920x1080', () => {
  test('Dashboard, board, task detail, leaderboard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    // Dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-1920x1080.png');

    // Project board - go directly to projects list
    await page.goto('/pm/projects', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    // Click on project card (not Create Project button)
    const projectCard = page.locator('a[href*="/pm/projects/"]:not([href*="new"])').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-board-1920x1080.png');

      // Task detail - click on a task card in the kanban board
      const taskLink = page.locator('a[href*="/pm/tasks/"]').first();
      if (await taskLink.isVisible()) {
        await taskLink.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'task-detail-1920x1080.png');
      }
    } else {
      console.log('No project card found at 1920x1080');
    }

    // Leaderboard
    await page.goto('/leaderboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'leaderboard-1920x1080.png');

    await context.close();
  });
});

test.describe('Final Screenshots - Desktop 1366x768', () => {
  test('Dashboard, board, task detail, leaderboard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    // Dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-1366x768.png');

    // Project board
    await page.goto('/pm/projects', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const projectCard = page.locator('a[href*="/pm/projects/"]:not([href*="new"])').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-board-1366x768.png');

      // Task detail
      const taskLink = page.locator('a[href*="/pm/tasks/"]').first();
      if (await taskLink.isVisible()) {
        await taskLink.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'task-detail-1366x768.png');
      }
    }

    // Leaderboard
    await page.goto('/leaderboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'leaderboard-1366x768.png');

    await context.close();
  });
});

test.describe('Final Screenshots - Mobile 390x844 Dark', () => {
  test('Dashboard, board, task detail, leaderboard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    // Dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'dashboard-390x844-dark.png');

    // Project board
    await page.goto('/pm/projects', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const projectCard = page.locator('a[href*="/pm/projects/"]:not([href*="new"])').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-board-390x844-dark.png');

      // Task detail
      const taskLink = page.locator('a[href*="/pm/tasks/"]').first();
      if (await taskLink.isVisible()) {
        await taskLink.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'task-detail-390x844-dark.png');
      }
    }

    // Leaderboard
    await page.goto('/leaderboard', { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'leaderboard-390x844-dark.png');

    await context.close();
  });
});

test.describe('Final Screenshots - Tablet 820x1180', () => {
  test('Board and task detail', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 820, height: 1180 },
    });
    await initContext(context);
    const page = await context.newPage();

    const loggedIn = await login(page, 'demo_manager');
    test.skip(!loggedIn, 'Login failed');

    // Project board
    await page.goto('/pm/projects', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const projectCard = page.locator('a[href*="/pm/projects/"]:not([href*="new"])').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-board-820x1180.png');

      // Task detail
      const taskLink = page.locator('a[href*="/pm/tasks/"]').first();
      if (await taskLink.isVisible()) {
        await taskLink.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'task-detail-820x1180.png');
      }
    }

    await context.close();
  });
});
