import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/screenshots';

async function login(page: any, username: string) {
  await page.goto('/login');
  await page.fill('input[name="login"]', username);
  await page.fill('input[name="password"]', 'Demo1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Screenshot Tests', () => {
  test('Login page', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const name = `login-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });

  test('Dashboard as admin', async ({ page }, testInfo) => {
    await login(page, 'demo_admin');
    await page.waitForLoadState('networkidle');
    
    const name = `dashboard-admin-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });

  test('Dashboard as member', async ({ page }, testInfo) => {
    await login(page, 'demo_member1');
    await page.waitForLoadState('networkidle');
    
    const name = `dashboard-member-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });

  test('PM My Tasks page', async ({ page }, testInfo) => {
    await login(page, 'demo_manager');
    await page.goto('/pm');
    await page.waitForLoadState('networkidle');
    
    const name = `pm-mytasks-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });

  test('PM Projects page', async ({ page }, testInfo) => {
    await login(page, 'demo_manager');
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');
    
    const name = `pm-projects-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });

  test('Leaderboard page', async ({ page }, testInfo) => {
    await login(page, 'demo_member1');
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    const name = `leaderboard-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
    await page.screenshot({ 
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true 
    });
  });
});

test.describe('Accessibility Tests', () => {
  test('Login page a11y', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = accessibilityScanResults.violations;
    console.log('Login page violations:', violations.length);
    violations.forEach(v => {
      console.log(`- ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
    });
    
    expect(violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
  });

  test('Dashboard a11y', async ({ page }) => {
    await login(page, 'demo_admin');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = accessibilityScanResults.violations;
    console.log('Dashboard violations:', violations.length);
    violations.forEach(v => {
      console.log(`- ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
    });
    
    expect(violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
  });
});
