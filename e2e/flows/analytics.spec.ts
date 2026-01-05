/**
 * Analytics E2E Tests
 * Tests for running backtests, viewing analytics, and exporting results
 */

import { expect, test } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';
import { createStrategy } from '../fixtures/strategy';
import { SELECTORS } from '../utils/constants';
import { assertVisible, clickWithRetry, waitForPageReady } from '../utils/helpers';

test.describe('Analytics Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
    await page.click('text=Enter Workspace');
    await waitForPageReady(page);
  });

  test('should run a backtest', async ({ page }) => {
    // Create a strategy first
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

    // Open backtest panel
    await clickWithRetry(page, '[data-testid="backtest-button"]');

    // Wait for backtest panel
    await assertVisible(page, '[data-testid="backtest-panel"]');

    // Configure backtest parameters
    await page.fill('[data-testid="backtest-start-date"]', '2024-01-01');
    await page.fill('[data-testid="backtest-end-date"]', '2024-12-31');
    await page.fill('[data-testid="backtest-initial-capital"]', '10000');

    // Run backtest
    await clickWithRetry(page, '[data-testid="run-backtest-button"]');

    // Wait for backtest to complete
    await page.waitForSelector('[data-testid="backtest-results"]', { timeout: 60000 });

    // Verify results are displayed
    await assertVisible(page, '[data-testid="backtest-results"]');
  });

  test('should view analytics dashboard', async ({ page }) => {
    // Open analytics dashboard
    await clickWithRetry(page, '[data-testid="analytics-button"]');

    // Wait for dashboard
    await assertVisible(page, '[data-testid="analytics-dashboard"]');

    // Verify key metrics are displayed
    await assertVisible(page, '[data-testid="metric-total-return"]');
    await assertVisible(page, '[data-testid="metric-sharpe-ratio"]');
    await assertVisible(page, '[data-testid="metric-max-drawdown"]');
  });

  test('should export backtest results', async ({ page }) => {
    // Run a backtest first (simplified)
    await clickWithRetry(page, '[data-testid="backtest-button"]');
    await assertVisible(page, '[data-testid="backtest-panel"]');

    // Click export button
    await clickWithRetry(page, '[data-testid="export-results-button"]');

    // Verify export options are shown
    await assertVisible(page, '[data-testid="export-options"]');

    // Select export format (e.g., CSV)
    await clickWithRetry(page, '[data-testid="export-format-csv"]');

    // Confirm export
    await clickWithRetry(page, '[data-testid="confirm-export-button"]');

    // Verify download started (this would need download handling)
    // For now, just verify the export dialog closed
    await page.waitForSelector('[data-testid="export-options"]', { state: 'hidden' });
  });

  test('should compare strategies', async ({ page }) => {
    // Open comparison view
    await clickWithRetry(page, '[data-testid="compare-strategies-button"]');

    // Wait for comparison view
    await assertVisible(page, '[data-testid="comparison-view"]');

    // Select strategies to compare
    await clickWithRetry(page, '[data-testid="select-strategy-1"]');
    await clickWithRetry(page, '[data-testid="select-strategy-2"]');

    // Run comparison
    await clickWithRetry(page, '[data-testid="run-comparison-button"]');

    // Verify comparison results
    await assertVisible(page, '[data-testid="comparison-results"]');
  });
});
