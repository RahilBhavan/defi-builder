/**
 * Strategy Fixtures
 * Helpers for E2E test strategy creation and manipulation
 */

import type { Page } from '@playwright/test';

export interface StrategyBlock {
  id: string;
  type: string;
  category: string;
  protocol?: string;
  config?: Record<string, unknown>;
}

/**
 * Create a simple strategy with blocks
 */
export async function createStrategy(page: Page, blocks: StrategyBlock[]): Promise<string> {
  // Navigate to workspace if not already there
  if (!page.url().includes('workspace')) {
    await page.goto('/');
    await page.click('text=Enter Workspace');
  }

  // Wait for workspace to load
  await page.waitForSelector('[data-testid="workspace-canvas"]', { timeout: 10000 });

  // Add blocks to canvas
  for (const block of blocks) {
    await addBlockToCanvas(page, block);
  }

  // Save strategy
  await page.click('[data-testid="save-strategy-button"]');
  await page.fill('[data-testid="strategy-name-input"]', `Test Strategy ${Date.now()}`);
  await page.click('[data-testid="save-confirm-button"]');

  // Wait for save confirmation
  await page.waitForSelector('text=Strategy saved', { timeout: 5000 });

  return `Test Strategy ${Date.now()}`;
}

/**
 * Add a block to the canvas
 */
export async function addBlockToCanvas(page: Page, block: StrategyBlock) {
  // Open block palette if not open
  const paletteButton = page.locator('[data-testid="block-palette-button"]');
  if (await paletteButton.isVisible()) {
    await paletteButton.click();
  }

  // Find and click the block type
  await page.click(`[data-testid="block-type-${block.type}"]`);

  // Configure block if needed
  if (block.config) {
    await configureBlock(page, block.id, block.config);
  }
}

/**
 * Configure a block
 */
export async function configureBlock(page: Page, blockId: string, config: Record<string, unknown>) {
  // Click on block to open config panel
  await page.click(`[data-testid="block-${blockId}"]`);

  // Wait for config panel
  await page.waitForSelector('[data-testid="block-config-panel"]', { timeout: 5000 });

  // Fill in configuration fields
  for (const [key, value] of Object.entries(config)) {
    const input = page.locator(`[data-testid="config-${key}"]`);
    if (await input.isVisible()) {
      await input.fill(String(value));
    }
  }

  // Save configuration
  await page.click('[data-testid="save-config-button"]');
}

/**
 * Load a strategy by name
 */
export async function loadStrategy(page: Page, strategyName: string) {
  // Open strategy library
  await page.click('[data-testid="strategy-library-button"]');

  // Wait for library modal
  await page.waitForSelector('[data-testid="strategy-library-modal"]', { timeout: 5000 });

  // Find and click strategy
  await page.click(`text=${strategyName}`);

  // Click load button
  await page.click('[data-testid="load-strategy-button"]');

  // Wait for strategy to load
  await page.waitForSelector('[data-testid="workspace-canvas"]', { timeout: 10000 });
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(page: Page, strategyName: string) {
  // Open strategy library
  await page.click('[data-testid="strategy-library-button"]');

  // Wait for library modal
  await page.waitForSelector('[data-testid="strategy-library-modal"]', { timeout: 5000 });

  // Find strategy and click delete
  const strategyCard = page.locator(`[data-testid="strategy-${strategyName}"]`);
  await strategyCard.locator('[data-testid="delete-strategy-button"]').click();

  // Confirm deletion
  await page.click('[data-testid="confirm-delete-button"]');

  // Wait for deletion confirmation
  await page.waitForSelector('text=Strategy deleted', { timeout: 5000 });
}

/**
 * Validate strategy structure
 */
export async function validateStrategy(page: Page): Promise<boolean> {
  // Check if strategy has required blocks
  const entryBlocks = await page.locator('[data-testid="block-category-ENTRY"]').count();
  const protocolBlocks = await page.locator('[data-testid="block-category-PROTOCOL"]').count();
  const exitBlocks = await page.locator('[data-testid="block-category-EXIT"]').count();

  return entryBlocks > 0 && protocolBlocks > 0 && exitBlocks > 0;
}
