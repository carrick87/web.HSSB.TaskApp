import { chromium, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/final2';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN || '';

async function initContext(context: BrowserContext): Promise<void> {
  if (SHARE_TOKEN) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/?_vercel_share=${SHARE_TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.close();
  }
}

async function login(page: Page, username: string): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', 'Demo1234!');
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

async function captureDesktopScreenshots(width: number, height: number, suffix: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
  });
  await initContext(context);
  const page = await context.newPage();

  const loggedIn = await login(page, 'demo_admin');
  if (!loggedIn) {
    console.error('Login failed, skipping desktop screenshots');
    await browser.close();
    return;
  }

  // Dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await screenshot(page, `dashboard-${suffix}.png`);

  // Project board - need to find a project
  await page.goto(`${BASE_URL}/pm/projects`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const projectLink = await page.locator('a[href^="/pm/projects/"]').first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await screenshot(page, `project-board-${suffix}.png`);
    
    // Task detail - click on a task
    const taskCard = await page.locator('[data-task-id], .task-card, [class*="task"]').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForTimeout(1000);
      await screenshot(page, `task-detail-${suffix}.png`);
    } else {
      console.log(`No task found at ${suffix}`);
    }
  } else {
    console.log(`No project found at ${suffix}`);
  }

  // Leaderboard
  await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await screenshot(page, `leaderboard-${suffix}.png`);

  await browser.close();
}

async function captureMobileDarkScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
  });
  await initContext(context);
  const page = await context.newPage();

  const loggedIn = await login(page, 'demo_admin');
  if (!loggedIn) {
    console.error('Login failed, skipping mobile dark screenshots');
    await browser.close();
    return;
  }

  // Dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await screenshot(page, `dashboard-390x844-dark.png`);

  // Project board
  await page.goto(`${BASE_URL}/pm/projects`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const projectLink = await page.locator('a[href^="/pm/projects/"]').first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await screenshot(page, `project-board-390x844-dark.png`);
    
    // Task detail
    const taskCard = await page.locator('[data-task-id], .task-card, [class*="task"]').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForTimeout(1000);
      await screenshot(page, `task-detail-390x844-dark.png`);
    }
  }

  // Leaderboard
  await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await screenshot(page, `leaderboard-390x844-dark.png`);

  await browser.close();
}

async function captureTabletScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
  });
  await initContext(context);
  const page = await context.newPage();

  const loggedIn = await login(page, 'demo_admin');
  if (!loggedIn) {
    console.error('Login failed, skipping tablet screenshots');
    await browser.close();
    return;
  }

  // Project board
  await page.goto(`${BASE_URL}/pm/projects`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const projectLink = await page.locator('a[href^="/pm/projects/"]').first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await screenshot(page, `project-board-820x1180.png`);
    
    // Task detail
    const taskCard = await page.locator('[data-task-id], .task-card, [class*="task"]').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForTimeout(1000);
      await screenshot(page, `task-detail-820x1180.png`);
    }
  }

  await browser.close();
}

async function main() {
  // Ensure directory exists
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log('Capturing screenshots...');
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`SHARE_TOKEN: ${SHARE_TOKEN ? 'set' : 'not set'}`);

  // 1. Desktop 1920x1080
  console.log('\n--- Desktop 1920x1080 ---');
  await captureDesktopScreenshots(1920, 1080, '1920x1080');

  // 2. Desktop 1366x768
  console.log('\n--- Desktop 1366x768 ---');
  await captureDesktopScreenshots(1366, 768, '1366x768');

  // 3. Mobile 390x844 dark mode
  console.log('\n--- Mobile 390x844 dark ---');
  await captureMobileDarkScreenshots();

  // 4. Tablet 820x1180
  console.log('\n--- Tablet 820x1180 ---');
  await captureTabletScreenshots();

  console.log('\nDone! Screenshots saved to:', SCREENSHOTS_DIR);
}

main().catch(console.error);
