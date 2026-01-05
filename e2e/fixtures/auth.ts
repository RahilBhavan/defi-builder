/**
 * Authentication Fixtures
 * Helpers for E2E test authentication
 */

import type { Page } from '@playwright/test';

/**
 * Mock user login for E2E tests
 */
export async function mockLogin(
  page: Page,
  walletAddress = '0x1234567890123456789012345678901234567890'
) {
  // Set localStorage to simulate logged-in user
  await page.addInitScript((address) => {
    localStorage.setItem('walletAddress', address);
    localStorage.setItem('isAuthenticated', 'true');
  }, walletAddress);
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('isAuthenticated');
  });
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page) {
  await page.waitForFunction(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
}
