import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/final';

const SHARE_TOKEN = process.env.VERCEL_SHARE_TOKEN || '';

async function initContext(context: BrowserContext): Promise<void> {
  if (SHARE_TOKEN) {
    const page = await context.newPage();
    await page.goto(`/?_vercel_share=${SHARE_TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.close();
  }
}

const VIEWPORTS = {
  'desktop-1920': { width: 1920, height: 1080, name: 'Desktop Full HD' },
  'desktop-1366': { width: 1366, height: 768, name: 'Desktop 1366' },
  'tablet-820': { width: 820, height: 1180, name: 'iPad' },
  'phone-430': { width: 430, height: 932, name: 'iPhone 14 Pro Max' },
  'phone-390': { width: 390, height: 844, name: 'iPhone 14' },
  'phone-375': { width: 375, height: 667, name: 'iPhone SE' },
  'phone-412': { width: 412, height: 915, name: 'Android Large' },
  'phone-360': { width: 360, height: 800, name: 'Android Small' },
};

const PAGES = {
  login: '/login',
  dashboard: '/dashboard',
  upcoming: '/tasks/upcoming',
  history: '/tasks/history',
  profile: '/profile',
  leaderboard: '/leaderboard',
  pmMyTasks: '/pm',
  pmProjects: '/pm/projects',
  pmTeam: '/pm/team',
  pmNewTask: '/pm/tasks/new',
  pmNewProject: '/pm/projects/new',
};

const ADMIN_PAGES = {
  admin: '/admin',
  adminUsers: '/admin/users',
  adminBranches: '/admin/branches',
  adminDepartments: '/admin/departments',
  adminPoints: '/admin/points',
};

const PIC_PAGES = {
  picDashboard: '/pic/dashboard',
  picVerify: '/pic/verify',
  picTemplates: '/pic/templates',
  picReports: '/pic/reports',
};

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function login(page: Page, username: string): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.fill('#login', username);
    await page.fill('#password', 'Demo1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    return true;
  } catch (e) {
    console.error(`Login failed for ${username}:`, e);
    return false;
  }
}

async function takeScreenshot(page: Page, name: string, viewport: string, colorScheme: string) {
  const fileName = `${name}-${viewport}${colorScheme === 'dark' ? '-dark' : ''}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

test.describe('Comprehensive Screenshot Tests', () => {
  test.beforeAll(async () => {
    await ensureDir(SCREENSHOTS_DIR);
  });

  for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
    const isPhone = vpKey.startsWith('phone');
    const colorSchemes = isPhone ? ['light', 'dark'] : ['light'];

    for (const colorScheme of colorSchemes) {
      test.describe(`${vp.name} - ${colorScheme}`, () => {
        
        test('Login page', async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: colorScheme as 'light' | 'dark',
            isMobile: isPhone,
            hasTouch: isPhone,
          });
          await initContext(context);
          const page = await context.newPage();
          
          await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
          await takeScreenshot(page, 'login', vpKey, colorScheme);
          await context.close();
        });

        test('All pages as admin', async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: colorScheme as 'light' | 'dark',
            isMobile: isPhone,
            hasTouch: isPhone,
          });
          await initContext(context);
          const page = await context.newPage();
          
          const loggedIn = await login(page, 'demo_admin');
          if (!loggedIn) {
            test.skip();
            return;
          }

          for (const [pageName, pageUrl] of Object.entries({ ...PAGES, ...ADMIN_PAGES, ...PIC_PAGES })) {
            if (pageName === 'login') continue;
            try {
              await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
              await page.waitForTimeout(500);
              await takeScreenshot(page, `admin-${pageName}`, vpKey, colorScheme);
            } catch (e) {
              console.error(`Failed to screenshot ${pageName}:`, e);
            }
          }

          await context.close();
        });

        test('All pages as member', async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: colorScheme as 'light' | 'dark',
            isMobile: isPhone,
            hasTouch: isPhone,
          });
          await initContext(context);
          const page = await context.newPage();
          
          const loggedIn = await login(page, 'demo_member1');
          if (!loggedIn) {
            test.skip();
            return;
          }

          for (const [pageName, pageUrl] of Object.entries(PAGES)) {
            if (pageName === 'login') continue;
            try {
              await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
              await page.waitForTimeout(500);
              await takeScreenshot(page, `member-${pageName}`, vpKey, colorScheme);
            } catch (e) {
              console.error(`Failed to screenshot ${pageName}:`, e);
            }
          }

          await context.close();
        });

        if (vpKey === 'desktop-1920' && colorScheme === 'light') {
          test('Project board and task detail', async ({ browser }) => {
            const context = await browser.newContext({
              viewport: { width: vp.width, height: vp.height },
            });
            await initContext(context);
            const page = await context.newPage();
            
            const loggedIn = await login(page, 'demo_manager');
            if (!loggedIn) {
              test.skip();
              return;
            }

            await page.goto('/pm/projects', { waitUntil: 'networkidle' });
            
            const projectLink = page.locator('a[href*="/pm/projects/"]').first();
            if (await projectLink.isVisible()) {
              await projectLink.click();
              await page.waitForLoadState('networkidle');
              await takeScreenshot(page, 'project-board', vpKey, colorScheme);
              
              const taskLink = page.locator('a[href*="/pm/tasks/"]').first();
              if (await taskLink.isVisible()) {
                await taskLink.click();
                await page.waitForLoadState('networkidle');
                await takeScreenshot(page, 'task-detail', vpKey, colorScheme);
              }
            }

            await context.close();
          });
        }

        if (isPhone && colorScheme === 'light') {
          test('Standalone PWA mode', async ({ browser }) => {
            const context = await browser.newContext({
              viewport: { width: vp.width, height: vp.height },
              isMobile: true,
              hasTouch: true,
            });
            await initContext(context);
            const page = await context.newPage();
            
            await page.addStyleTag({
              content: `
                @media all and (display-mode: standalone) {
                  body::before {
                    content: 'PWA Mode';
                    position: fixed;
                    top: 0;
                    left: 0;
                    background: green;
                    color: white;
                    padding: 2px 8px;
                    z-index: 9999;
                    font-size: 10px;
                  }
                }
              `
            });

            await page.emulateMedia({ media: 'screen' });
            
            const loggedIn = await login(page, 'demo_admin');
            if (!loggedIn) {
              test.skip();
              return;
            }

            await takeScreenshot(page, 'pwa-dashboard', vpKey, colorScheme);
            await context.close();
          });
        }
      });
    }
  }
});

test.describe('Accessibility Tests', () => {
  const testPages = [
    { name: 'login', url: '/login', needsAuth: false },
    { name: 'dashboard', url: '/dashboard', needsAuth: true },
    { name: 'leaderboard', url: '/leaderboard', needsAuth: true },
    { name: 'pm-tasks', url: '/pm', needsAuth: true },
  ];

  for (const testPage of testPages) {
    test(`${testPage.name} page accessibility`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });
      await initContext(context);
      const page = await context.newPage();

      if (testPage.needsAuth) {
        const loggedIn = await login(page, 'demo_admin');
        if (!loggedIn) {
          test.skip();
          return;
        }
      }

      await page.goto(testPage.url, { waitUntil: 'networkidle' });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      
      console.log(`\n=== ${testPage.name} Accessibility Results ===`);
      console.log(`Total violations: ${results.violations.length}`);
      console.log(`Serious/Critical: ${serious.length}`);
      
      if (results.violations.length > 0) {
        console.log('\nViolations:');
        results.violations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        });
      }

      fs.writeFileSync(
        path.join(SCREENSHOTS_DIR, `axe-${testPage.name}.json`),
        JSON.stringify(results, null, 2)
      );

      expect(serious.length, `${testPage.name} has serious accessibility violations`).toBe(0);

      await context.close();
    });
  }
});

test('Offline page', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await initContext(context);
  const page = await context.newPage();

  await page.goto('/offline.html', { waitUntil: 'networkidle', timeout: 30000 });
  await takeScreenshot(page, 'offline', 'phone-390', 'light');

  await context.close();
});

test.describe('Layout Regression Tests', () => {
  const desktopWidths = [820, 1024, 1280, 1366, 1920];
  
  for (const width of desktopWidths) {
    test(`Main content not covered by sidebar at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await initContext(context);
      const page = await context.newPage();
      
      const loggedIn = await login(page, 'demo_admin');
      if (!loggedIn) {
        test.skip();
        return;
      }

      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside.lg\\:flex');
      const mainContent = page.locator('main.main-content');

      const sidebarVisible = await sidebar.isVisible();
      
      if (width >= 1024 && sidebarVisible) {
        const sidebarBox = await sidebar.boundingBox();
        const mainBox = await mainContent.boundingBox();

        expect(sidebarBox, 'Sidebar should be visible at lg breakpoint').not.toBeNull();
        expect(mainBox, 'Main content should be visible').not.toBeNull();

        if (sidebarBox && mainBox) {
          expect(
            mainBox.x,
            `Main content left edge (${mainBox.x}) should be >= sidebar right edge (${sidebarBox.x + sidebarBox.width})`
          ).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 1);
        }
      }

      await context.close();
    });
  }
});
