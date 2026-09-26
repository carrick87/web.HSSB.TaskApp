import { test, Page, BrowserContext, expect } from '@playwright/test';

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

test('Debug gap at 390x844', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await initContext(context);
  const page = await context.newPage();

  const loggedIn = await login(page, 'demo_manager');
  expect(loggedIn).toBe(true);

  await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);

  // Inspect computed styles and layout
  const debugInfo = await page.evaluate(() => {
    const header = document.querySelector('header.lg\\:hidden') as HTMLElement;
    const main = document.querySelector('main.main-content') as HTMLElement;
    const innerDiv = main?.querySelector(':scope > div') as HTMLElement;
    const pageWrapper = innerDiv?.querySelector(':scope > div') as HTMLElement;
    const h1 = document.querySelector('h1') as HTMLElement;

    const getComputedStyles = (el: HTMLElement | null, name: string) => {
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        name,
        tag: el.tagName,
        className: el.className.slice(0, 100),
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
        computed: {
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
          marginTop: styles.marginTop,
          marginBottom: styles.marginBottom,
        },
      };
    };

    return {
      header: getComputedStyles(header, 'header'),
      main: getComputedStyles(main, 'main'),
      innerDiv: getComputedStyles(innerDiv, 'innerDiv'),
      pageWrapper: getComputedStyles(pageWrapper, 'pageWrapper'),
      h1: getComputedStyles(h1, 'h1'),
      documentTop: document.documentElement.getBoundingClientRect().top,
    };
  });

  console.log('\n=== Debug Info ===');
  console.log(JSON.stringify(debugInfo, null, 2));

  // Calculate gaps
  if (debugInfo.header && debugInfo.h1) {
    console.log(`\n=== Gap Analysis ===`);
    console.log(`Header bottom: ${debugInfo.header.rect.bottom}`);
    console.log(`H1 top: ${debugInfo.h1.rect.top}`);
    console.log(`Gap: ${debugInfo.h1.rect.top - debugInfo.header.rect.bottom}px`);
  }

  await context.close();
});
