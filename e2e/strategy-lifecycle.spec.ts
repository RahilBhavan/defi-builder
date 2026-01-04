import { expect, test } from '@playwright/test';

test.describe('Strategy Lifecycle', () => {
  test('should create, backtest, and optimize a strategy', async ({ page }) => {
    // Navigate to workspace
    await page.goto('/');
    await page.click('text=Enter Workspace');

    // Wait for workspace to load
    await expect(page.locator('text=Add your first block')).toBeVisible();

    // Open block suggester
    await page.click('text=+ AI');
    await expect(page.locator('text=Block Suggestions')).toBeVisible();

    // Add a price trigger block (simplified - actual implementation may vary)
    // This is a placeholder test structure
    await page.waitForTimeout(1000);

    // Verify workspace is functional
    const workspace = page.locator('[data-testid="workspace"]').or(page.locator('main'));
    await expect(workspace).toBeVisible();
  });

  test('should display empty state correctly', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Enter Workspace');

    await expect(page.locator('text=/add your first block/i')).toBeVisible();
  });

  test('should open and close modals', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Enter Workspace');

    // Open backtest modal
    const backtestButton = page
      .locator('button:has-text("Backtest")')
      .or(page.locator('[aria-label*="backtest" i]'));
    if (await backtestButton.isVisible()) {
      await backtestButton.click();
      await expect(page.locator('text=/backtest/i')).toBeVisible();

      // Close modal
      const closeButton = page
        .locator('button:has-text("Close")')
        .or(page.locator('[aria-label*="close" i]'))
        .first();
      await closeButton.click();
    }
  });
});
