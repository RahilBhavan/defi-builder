/**
 * Alert System E2E Tests
 * Tests for alert creation, triggering, and notifications
 */

import { expect, test } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';
import { simulateAlert } from '../fixtures/websocket';
import { SELECTORS, TEST_ALERTS } from '../utils/constants';
import { assertVisible, clickWithRetry, waitForPageReady } from '../utils/helpers';

test.describe('Alert System Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
    await page.click('text=Enter Workspace');
    await waitForPageReady(page);
  });

  test('should create a price alert', async ({ page }) => {
    // Open alert manager
    await clickWithRetry(page, SELECTORS.ALERT_MANAGER_BUTTON);

    // Wait for alert manager modal
    await assertVisible(page, '[data-testid="alert-manager-modal"]');

    // Click create alert button
    await clickWithRetry(page, '[data-testid="create-alert-button"]');

    // Fill in alert form
    await page.fill('[data-testid="alert-name-input"]', TEST_ALERTS.PRICE_ABOVE.name);
    await page.selectOption('[data-testid="alert-type-select"]', 'price');
    await page.fill(
      '[data-testid="alert-token-input"]',
      TEST_ALERTS.PRICE_ABOVE.condition.token || ''
    );
    await page.fill(
      '[data-testid="alert-value-input"]',
      String(TEST_ALERTS.PRICE_ABOVE.condition.value)
    );

    // Submit form
    await clickWithRetry(page, '[data-testid="submit-alert-button"]');

    // Verify alert was created
    await assertVisible(page, `text=${TEST_ALERTS.PRICE_ABOVE.name}`);
  });

  test('should receive alert notification', async ({ page }) => {
    // Grant notification permission
    await page.context().grantPermissions(['notifications']);

    // Create alert (simplified - would normally use the UI)
    // For E2E, we might need to set up alerts via API or localStorage

    // Simulate alert trigger
    await simulateAlert(page, {
      alertId: 'test-alert-1',
      alertName: TEST_ALERTS.PRICE_ABOVE.name,
      type: 'price',
      token: TEST_ALERTS.PRICE_ABOVE.condition.token,
      price: 3500, // Above threshold
    });

    // Verify notification was shown (this would need browser notification API support)
    // For now, verify alert appears in UI
    await assertVisible(page, '[data-testid="alert-notification"]');
  });

  test('should manage alerts', async ({ page }) => {
    // Open alert manager
    await clickWithRetry(page, SELECTORS.ALERT_MANAGER_BUTTON);

    // Wait for alert manager modal
    await assertVisible(page, '[data-testid="alert-manager-modal"]');

    // Verify alert list is visible
    await assertVisible(page, '[data-testid="alert-list"]');
  });
});
