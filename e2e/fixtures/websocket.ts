/**
 * WebSocket Fixtures
 * Helpers for E2E test WebSocket interactions
 */

import type { Page } from '@playwright/test';

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocketConnection(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      // Check if WebSocket connection status is 'connected'
      const statusElement = document.querySelector('[data-testid="connection-status"]');
      return statusElement?.textContent?.includes('Connected');
    },
    { timeout }
  );
}

/**
 * Simulate WebSocket price update
 */
export async function simulatePriceUpdate(page: Page, token: string, price: number) {
  await page.evaluate(
    ({ token, price }) => {
      // Dispatch custom event to simulate WebSocket message
      window.dispatchEvent(
        new CustomEvent('websocket:price-update', {
          detail: {
            token,
            price,
            timestamp: Date.now(),
          },
        })
      );
    },
    { token, price }
  );
}

/**
 * Simulate WebSocket alert
 */
export async function simulateAlert(
  page: Page,
  alert: {
    alertId: string;
    alertName: string;
    type: string;
    token?: string;
    price?: number;
  }
) {
  await page.evaluate(
    ({ alert }) => {
      window.dispatchEvent(
        new CustomEvent('websocket:alert', {
          detail: alert,
        })
      );
    },
    { alert }
  );
}

/**
 * Check if WebSocket is connected
 */
export async function isWebSocketConnected(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const statusElement = document.querySelector('[data-testid="connection-status"]');
    return statusElement?.textContent?.includes('Connected') ?? false;
  });
}
