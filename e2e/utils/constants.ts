/**
 * E2E Test Constants
 * Shared constants for E2E tests
 */

export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
  VERY_LONG: 60000,
} as const;

export const TEST_TOKENS = {
  ETH: 'ETH',
  BTC: 'BTC',
  USDC: 'USDC',
  DAI: 'DAI',
} as const;

export const TEST_PRICES = {
  ETH: 2500,
  BTC: 45000,
  USDC: 1.0,
  DAI: 1.0,
} as const;

export const TEST_STRATEGY_NAMES = {
  BASIC: 'Basic Test Strategy',
  COMPLEX: 'Complex Test Strategy',
  MARKETPLACE: 'Marketplace Test Strategy',
} as const;

export const TEST_ALERTS = {
  PRICE_ABOVE: {
    name: 'Price Above Alert',
    type: 'price',
    condition: {
      operator: 'gt',
      value: 3000,
      field: 'price',
      token: 'ETH',
    },
  },
  PRICE_BELOW: {
    name: 'Price Below Alert',
    type: 'price',
    condition: {
      operator: 'lt',
      value: 2000,
      field: 'price',
      token: 'ETH',
    },
  },
} as const;

export const SELECTORS = {
  WORKSPACE_CANVAS: '[data-testid="workspace-canvas"]',
  BLOCK_PALETTE: '[data-testid="block-palette"]',
  SAVE_STRATEGY_BUTTON: '[data-testid="save-strategy-button"]',
  STRATEGY_LIBRARY_BUTTON: '[data-testid="strategy-library-button"]',
  CONNECTION_STATUS: '[data-testid="connection-status"]',
  ALERT_MANAGER_BUTTON: '[data-testid="alert-manager-button"]',
  MARKETPLACE_BUTTON: '[data-testid="marketplace-button"]',
} as const;
