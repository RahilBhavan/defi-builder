import { devices, expect, test } from '@playwright/test';

test.use(devices['iPhone 12']);

test.describe('Mobile Responsiveness', () => {
  test('should render on mobile viewport', async ({ page }) => {
    await page.goto('/');

    // Check that page loads
    await expect(page.locator('body')).toBeVisible();

    // Check viewport size
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(390);
  });

  test('should be usable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Enter Workspace');

    // Verify workspace is accessible
    const workspace = page.locator('main');
    await expect(workspace).toBeVisible();
  });
});
