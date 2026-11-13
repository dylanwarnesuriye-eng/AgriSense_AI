import { test, expect } from '@playwright/test';

test('system chrome sanity launch check', async ({ page }) => {
  await page.setContent('<html><body><h1>AgriSense AI Real Browser Test</h1></body></html>');
  const heading = page.locator('h1');
  await expect(heading).toHaveText('AgriSense AI Real Browser Test');
});
