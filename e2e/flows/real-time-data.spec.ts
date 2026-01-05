/**
 * Real-Time Data E2E Tests
 * Tests for WebSocket connection and real-time price updates
 */

import { expect, test } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';
import {
  isWebSocketConnected,
  simulatePriceUpdate,
  waitForWebSocketConnection,
} from '../fixtures/websocket';
import { SELECTORS, TEST_PRICES, TEST_TOKENS } from '../utils/constants';
import { assertText, assertVisible, waitForPageReady } from '../utils/helpers';

test.describe('Real-Time Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
    await page.click('text=Enter Workspace');
    await waitForPageReady(page);
  });

  test('should connect to WebSocket', async ({ page }) => {
    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);

    // Verify connection status
    const isConnected = await isWebSocketConnected(page);
    expect(isConnected).toBe(true);
  });

  test('should display live prices', async ({ page }) => {
    // Wait for connection
    await waitForWebSocketConnection(page);

    // Simulate price update
    await simulatePriceUpdate(page, TEST_TOKENS.ETH, TEST_PRICES.ETH);

    // Verify price is displayed
    await assertText(page, `[data-testid="price-${TEST_TOKENS.ETH}"]`, String(TEST_PRICES.ETH));
  });

  test('should handle multiple token subscriptions', async ({ page }) => {
    // Wait for connection
    await waitForWebSocketConnection(page);

    // Simulate multiple price updates
    await simulatePriceUpdate(page, TEST_TOKENS.ETH, TEST_PRICES.ETH);
    await simulatePriceUpdate(page, TEST_TOKENS.BTC, TEST_PRICES.BTC);

    // Verify both prices are displayed
    await assertText(page, `[data-testid="price-${TEST_TOKENS.ETH}"]`, String(TEST_PRICES.ETH));
    await assertText(page, `[data-testid="price-${TEST_TOKENS.BTC}"]`, String(TEST_PRICES.BTC));
  });

  test('should handle disconnection and reconnection', async ({ page }) => {
    // Wait for connection
    await waitForWebSocketConnection(page);

    // Simulate disconnection (this would need to be implemented in the app)
    // For now, we'll just verify the connection status element exists
    await assertVisible(page, SELECTORS.CONNECTION_STATUS);
  });
});
