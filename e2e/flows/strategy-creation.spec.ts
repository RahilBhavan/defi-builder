/**
 * Strategy Creation E2E Tests
 * Tests for creating, saving, loading, and deleting strategies
 */

import { expect, test } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';
import {
  createStrategy,
  deleteStrategy,
  loadStrategy,
  validateStrategy,
} from '../fixtures/strategy';
import { SELECTORS, TEST_STRATEGY_NAMES } from '../utils/constants';
import { assertVisible, waitForPageReady } from '../utils/helpers';

test.describe('Strategy Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
    await page.click('text=Enter Workspace');
    await waitForPageReady(page);
  });

  test('should create a basic strategy', async ({ page }) => {
    // Wait for workspace to load
    await assertVisible(page, SELECTORS.WORKSPACE_CANVAS);

    // Create a simple strategy
    const strategyName = await createStrategy(page, [
      {
        id: 'entry-1',
        type: 'Entry',
        category: 'ENTRY',
        config: { amount: '1000' },
      },
      {
        id: 'protocol-1',
        type: 'Uniswap',
        category: 'PROTOCOL',
        protocol: 'uniswap',
      },
      {
        id: 'exit-1',
        type: 'Exit',
        category: 'EXIT',
      },
    ]);

    // Verify strategy was created
    expect(strategyName).toBeTruthy();
  });

  test('should save and load a strategy', async ({ page }) => {
    // Create strategy
    const strategyName = await createStrategy(page, [
      {
        id: 'entry-1',
        type: 'Entry',
        category: 'ENTRY',
      },
      {
        id: 'protocol-1',
        type: 'Uniswap',
        category: 'PROTOCOL',
        protocol: 'uniswap',
      },
      {
        id: 'exit-1',
        type: 'Exit',
        category: 'EXIT',
      },
    ]);

    // Load strategy
    await loadStrategy(page, strategyName);

    // Verify strategy loaded
    await assertVisible(page, SELECTORS.WORKSPACE_CANVAS);
  });

  test('should validate strategy structure', async ({ page }) => {
    // Create complete strategy
    await createStrategy(page, [
      {
        id: 'entry-1',
        type: 'Entry',
        category: 'ENTRY',
      },
      {
        id: 'protocol-1',
        type: 'Uniswap',
        category: 'PROTOCOL',
        protocol: 'uniswap',
      },
      {
        id: 'exit-1',
        type: 'Exit',
        category: 'EXIT',
      },
    ]);

    // Validate structure
    const isValid = await validateStrategy(page);
    expect(isValid).toBe(true);
  });

  test('should delete a strategy', async ({ page }) => {
    // Create strategy
    const strategyName = await createStrategy(page, [
      {
        id: 'entry-1',
        type: 'Entry',
        category: 'ENTRY',
      },
      {
        id: 'protocol-1',
        type: 'Uniswap',
        category: 'PROTOCOL',
        protocol: 'uniswap',
      },
      {
        id: 'exit-1',
        type: 'Exit',
        category: 'EXIT',
      },
    ]);

    // Delete strategy
    await deleteStrategy(page, strategyName);

    // Verify strategy was deleted
    await page.click(SELECTORS.STRATEGY_LIBRARY_BUTTON);
    await expect(page.locator(`text=${strategyName}`)).not.toBeVisible();
  });
});
