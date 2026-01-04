/**
 * Testing Framework Integration
 * Helpers for Vitest and Playwright integration
 */

import { MockAPIServer } from './mockServer';
import { DeFiMocks } from './defiMocks';
import type { MockRoute, MockScenario } from './types';
import { logger } from '../utils/logger';

/**
 * Mock server instance for tests
 */
let mockServerInstance: MockAPIServer | null = null;

/**
 * Vitest integration helpers
 */
export const vitestMockHelpers = {
  /**
   * Setup mock server before all tests
   */
  async setup(port = 3001): Promise<MockAPIServer> {
    if (mockServerInstance) {
      return mockServerInstance;
    }

    mockServerInstance = new MockAPIServer(port);

    // Load default DeFi mocks
    const mocks = DeFiMocks.getAllMocks();
    for (const mock of mocks) {
      mockServerInstance.addStub(mock);
    }

    // Create DeFi scenarios
    mockServerInstance.scenarioManager.createDeFiScenarios();

    await mockServerInstance.start();

    logger.info(`Mock server started on port ${port} for testing`);
    return mockServerInstance;
  },

  /**
   * Cleanup after all tests
   */
  async teardown(): Promise<void> {
    if (mockServerInstance) {
      await mockServerInstance.stop();
      mockServerInstance = null;
      logger.info('Mock server stopped');
    }
  },

  /**
   * Reset before each test
   */
  reset(): void {
    if (mockServerInstance) {
      mockServerInstance.reset();
    }
  },

  /**
   * Get mock server instance
   */
  getServer(): MockAPIServer {
    if (!mockServerInstance) {
      throw new Error('Mock server not initialized. Call setup() first');
    }
    return mockServerInstance;
  }
};

/**
 * Vitest setup file helper
 * Add to vitest.setup.ts
 */
export function setupVitestMocks() {
  return `
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { vitestMockHelpers } from './backend/src/mocks/testingIntegration';

beforeAll(async () => {
  await vitestMockHelpers.setup(3001);
}, 30000);

afterAll(async () => {
  await vitestMockHelpers.teardown();
});

beforeEach(() => {
  vitestMockHelpers.reset();
});

// Make helpers available globally
global.mockServer = vitestMockHelpers.getServer();
`;
}

/**
 * Mock builder for fluent test setup
 */
export class MockBuilder {
  private server: MockAPIServer;
  private stubs: MockRoute[] = [];

  constructor(server: MockAPIServer) {
    this.server = server;
  }

  public when(method: string, path: string): MockStubBuilder {
    return new MockStubBuilder(this, method, path);
  }

  public addStub(stub: MockRoute): this {
    this.stubs.push(stub);
    this.server.addStub(stub);
    return this;
  }

  public setScenario(scenario: string): this {
    this.server.setScenario(scenario);
    return this;
  }

  public verify(): MockVerifier {
    return new MockVerifier(this.server);
  }

  public async apply(): Promise<void> {
    for (const stub of this.stubs) {
      this.server.addStub(stub);
    }
  }
}

/**
 * Stub builder for fluent API
 */
class MockStubBuilder {
  private mockBuilder: MockBuilder;
  private stub: Partial<MockRoute>;

  constructor(mockBuilder: MockBuilder, method: string, path: string) {
    this.mockBuilder = mockBuilder;
    this.stub = { method, path };
  }

  public withQueryParams(params: Record<string, string>): this {
    if (!this.stub.matchers) {
      this.stub.matchers = [];
    }
    this.stub.matchers.push({
      type: 'query_params',
      params
    });
    return this;
  }

  public withBody(body: any): this {
    if (!this.stub.matchers) {
      this.stub.matchers = [];
    }
    this.stub.matchers.push({
      type: 'body',
      body,
      matchType: 'exact'
    });
    return this;
  }

  public thenReturn(status: number, body?: any): MockBuilder {
    this.stub.response = { status, body };
    return this.mockBuilder.addStub(this.stub as MockRoute);
  }

  public thenReturnError(status: number, error: string): MockBuilder {
    this.stub.response = {
      status,
      body: { error }
    };
    return this.mockBuilder.addStub(this.stub as MockRoute);
  }
}

/**
 * Mock verifier for assertions
 */
class MockVerifier {
  constructor(private server: MockAPIServer) {}

  public wasCalledWith(
    method: string,
    path: string,
    bodyMatcher?: (body: any) => boolean
  ): boolean {
    const requests = this.server.getRequests({ method, path });

    if (requests.length === 0) {
      return false;
    }

    if (bodyMatcher) {
      return requests.some(req => bodyMatcher(req.body));
    }

    return true;
  }

  public wasCalledTimes(method: string, path: string, times: number): boolean {
    const requests = this.server.getRequests({ method, path });
    return requests.length === times;
  }

  public neverCalled(method: string, path: string): boolean {
    return this.wasCalledTimes(method, path, 0);
  }

  public getLastRequest(method: string, path: string): any {
    const requests = this.server.getRequests({ method, path });
    return requests[requests.length - 1];
  }
}

/**
 * Test scenario helpers
 */
export const testScenarios = {
  /**
   * Setup happy path scenario
   */
  happyPath: (server: MockAPIServer) => {
    server.setScenario('happy_path');
  },

  /**
   * Setup error scenario
   */
  withErrors: (server: MockAPIServer) => {
    server.setScenario('error_scenario');
  },

  /**
   * Setup slow response scenario
   */
  withSlowResponses: (server: MockAPIServer) => {
    server.setScenario('slow_responses');
  },

  /**
   * Setup bull market scenario
   */
  bullMarket: (server: MockAPIServer) => {
    server.setScenario('bull_market');
  },

  /**
   * Setup bear market scenario
   */
  bearMarket: (server: MockAPIServer) => {
    server.setScenario('bear_market');
  },

  /**
   * Setup flash crash scenario
   */
  flashCrash: (server: MockAPIServer) => {
    server.setScenario('flash_crash');
  },

  /**
   * Setup network congestion scenario
   */
  networkCongestion: (server: MockAPIServer) => {
    server.setScenario('network_congestion');
  }
};

/**
 * Playwright integration helpers
 */
export const playwrightMockHelpers = {
  /**
   * Setup mock server for Playwright tests
   */
  async setup(port = 3001): Promise<string> {
    const server = await vitestMockHelpers.setup(port);
    return `http://localhost:${port}`;
  },

  /**
   * Cleanup
   */
  async teardown(): Promise<void> {
    await vitestMockHelpers.teardown();
  },

  /**
   * Override API endpoint in Playwright
   */
  getRouteOverrides() {
    return `
// In your Playwright test
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Route API calls to mock server
  await page.route('**/api/**', async (route) => {
    const url = route.request().url().replace(
      /^.*?\\/api\\//,
      'http://localhost:3001/api/'
    );

    const response = await fetch(url, {
      method: route.request().method(),
      headers: route.request().headers(),
      body: route.request().postDataBuffer()
    });

    const body = await response.text();

    route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body
    });
  });
});

test('should display price data', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Mock server will return price data
  await expect(page.locator('[data-testid="eth-price"]')).toBeVisible();
});
`;
  }
};

/**
 * Example test using the helpers
 */
export const exampleTest = `
import { describe, it, expect, beforeEach } from 'vitest';
import { MockBuilder, testScenarios, vitestMockHelpers } from './testingIntegration';

describe('DeFi Strategy Tests', () => {
  let mockBuilder: MockBuilder;

  beforeEach(() => {
    const server = vitestMockHelpers.getServer();
    mockBuilder = new MockBuilder(server);
    testScenarios.happyPath(server);
  });

  it('should execute a swap successfully', async () => {
    // Setup mock
    mockBuilder
      .when('POST', '/api/pool/0x123/swap')
      .withBody({
        amountIn: '1000000000000000000',
        tokenIn: 'ETH',
        tokenOut: 'USDC'
      })
      .thenReturn(200, {
        amountOut: '2000000000',
        txHash: '0xabc123'
      });

    // Execute your code that makes the API call
    const result = await executeSwap('ETH', 'USDC', '1.0');

    // Verify
    expect(result.success).toBe(true);
    expect(mockBuilder.verify().wasCalledWith(
      'POST',
      '/api/pool/0x123/swap',
      (body) => body.tokenIn === 'ETH'
    )).toBe(true);
  });

  it('should handle slippage errors', async () => {
    // Setup error scenario
    mockBuilder
      .when('POST', '/api/pool/0x123/swap')
      .thenReturnError(400, 'Slippage tolerance exceeded');

    // Execute and expect error
    await expect(executeSwap('ETH', 'USDC', '1.0'))
      .rejects
      .toThrow('Slippage tolerance exceeded');
  });

  it('should work in bull market scenario', async () => {
    const server = vitestMockHelpers.getServer();
    testScenarios.bullMarket(server);

    // Prices should be higher in bull market
    const price = await getTokenPrice('ETH');
    expect(price).toBeGreaterThan(2000);
  });
});
`;
