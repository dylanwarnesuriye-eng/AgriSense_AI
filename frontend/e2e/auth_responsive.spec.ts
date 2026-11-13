import { test, expect } from '@playwright/test';

test.describe('AgriSense AI — Authentication UI Responsiveness (Task 13)', () => {
  test('Desktop (1280x720): Clean centered layout, no overflow, no sidebar', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Confirm Auth Page is rendered
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Sign in to continue to AgriSense AI')).toBeVisible();

    // 2. Ensure application sidebar is NOT rendered
    await expect(page.locator('aside')).toHaveCount(0);
    await expect(page.locator('header')).toHaveCount(0);
    await expect(page.locator('text=Active Farm Context')).toHaveCount(0);

    // 3. Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // 4. Verify Password Toggle accessibility
    const toggleBtn = page.locator('button[aria-label="Show password"]');
    await expect(toggleBtn).toBeVisible();
    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await context.close();
  });

  test('Mobile (390x844): Full-width mobile touch targets, no horizontal overflow', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Confirm Welcome screen
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    // 2. Ensure sidebar and header are NOT rendered
    await expect(page.locator('aside')).toHaveCount(0);
    await expect(page.locator('button[aria-label="Open mobile menu"]')).toHaveCount(0);

    // 3. Confirm no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // 4. Confirm submit button min height (44px touch target)
    const submitBtn = page.locator('button[type="submit"]');
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // 5. Navigate to Register and test responsiveness
    await page.locator('button:has-text("Create account")').click();
    await expect(page.locator('text=Join AgriSense AI for precision agronomic intelligence')).toBeVisible();

    const registerScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const registerClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(registerScrollWidth).toBeLessThanOrEqual(registerClientWidth);

    await context.close();
  });
});
