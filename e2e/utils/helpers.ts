/**
 * E2E Test Helpers
 * Common utilities for E2E tests
 */

import { type Page, expect } from '@playwright/test';

/**
 * Wait for element with retry
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: { timeout?: number; state?: 'attached' | 'visible' | 'hidden' }
) {
  const timeout = options?.timeout ?? 10000;
  const state = options?.state ?? 'visible';

  await page.waitForSelector(selector, { timeout, state });
}

/**
 * Wait for text content
 */
export async function waitForText(page: Page, text: string, timeout = 10000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Click element with retry
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  options?: { timeout?: number; retries?: number }
) {
  const timeout = options?.timeout ?? 10000;
  const retries = options?.retries ?? 3;

  for (let i = 0; i < retries; i++) {
    try {
      await page.click(selector, { timeout });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Fill input with retry
 */
export async function fillWithRetry(
  page: Page,
  selector: string,
  value: string,
  options?: { timeout?: number; retries?: number }
) {
  const timeout = options?.timeout ?? 10000;
  const retries = options?.retries ?? 3;

  for (let i = 0; i < retries; i++) {
    try {
      await page.fill(selector, value, { timeout });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Assert element is visible
 */
export async function assertVisible(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
}

/**
 * Assert element contains text
 */
export async function assertText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await expect(element).toContainText(text);
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for page to be ready
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}
