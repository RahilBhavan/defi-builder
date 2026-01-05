/**
 * Marketplace E2E Tests
 * Tests for browsing, forking, and rating strategies in the marketplace
 */

import { expect, test } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';
import { SELECTORS } from '../utils/constants';
import { assertVisible, clickWithRetry, waitForPageReady } from '../utils/helpers';

test.describe('Marketplace Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
    await page.click('text=Enter Workspace');
    await waitForPageReady(page);
  });

  test('should browse public strategies', async ({ page }) => {
    // Open marketplace
    await clickWithRetry(page, SELECTORS.MARKETPLACE_BUTTON);

    // Wait for marketplace modal
    await assertVisible(page, '[data-testid="marketplace-modal"]');

    // Verify strategy list is visible
    await assertVisible(page, '[data-testid="strategy-list"]');
  });

  test('should search for strategies', async ({ page }) => {
    // Open marketplace
    await clickWithRetry(page, SELECTORS.MARKETPLACE_BUTTON);

    // Wait for marketplace modal
    await assertVisible(page, '[data-testid="marketplace-modal"]');

    // Enter search query
    await page.fill('[data-testid="search-input"]', 'ETH');

    // Wait for search results
    await page.waitForTimeout(1000); // Wait for search to complete

    // Verify results are displayed
    await assertVisible(page, '[data-testid="strategy-list"]');
  });

  test('should filter strategies by category', async ({ page }) => {
    // Open marketplace
    await clickWithRetry(page, SELECTORS.MARKETPLACE_BUTTON);

    // Wait for marketplace modal
    await assertVisible(page, '[data-testid="marketplace-modal"]');

    // Click category filter
    await clickWithRetry(page, '[data-testid="category-filter"]');

    // Select a category
    await clickWithRetry(page, '[data-testid="category-option-yield"]');

    // Verify filtered results
    await assertVisible(page, '[data-testid="strategy-list"]');
  });

  test('should fork a strategy', async ({ page }) => {
    // Open marketplace
    await clickWithRetry(page, SELECTORS.MARKETPLACE_BUTTON);

    // Wait for marketplace modal
    await assertVisible(page, '[data-testid="marketplace-modal"]');

    // Find a strategy and click fork
    const firstStrategy = page.locator('[data-testid="strategy-card"]').first();
    await firstStrategy.locator('[data-testid="fork-button"]').click();

    // Confirm fork
    await clickWithRetry(page, '[data-testid="confirm-fork-button"]');

    // Verify strategy was forked (should appear in workspace or library)
    await assertVisible(page, SELECTORS.WORKSPACE_CANVAS);
  });

  test('should rate a strategy', async ({ page }) => {
    // Open marketplace
    await clickWithRetry(page, SELECTORS.MARKETPLACE_BUTTON);

    // Wait for marketplace modal
    await assertVisible(page, '[data-testid="marketplace-modal"]');

    // Find a strategy and click rate
    const firstStrategy = page.locator('[data-testid="strategy-card"]').first();
    await firstStrategy.locator('[data-testid="rate-button"]').click();

    // Select rating (e.g., 5 stars)
    await clickWithRetry(page, '[data-testid="rating-5"]');

    // Submit rating
    await clickWithRetry(page, '[data-testid="submit-rating-button"]');

    // Verify rating was submitted
    await assertVisible(page, 'text=Rating submitted');
  });
});
