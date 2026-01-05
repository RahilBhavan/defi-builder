/**
 * Example Tests Demonstrating Mock API Usage
 * These tests show how to use the mock API server in your tests
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockBuilder, testScenarios, vitestMockHelpers } from '../../backend/src/mocks';

describe('Mock API Examples', () => {
  beforeAll(async () => {
    await vitestMockHelpers.setup(3001);
  }, 30000);

  afterAll(async () => {
    await vitestMockHelpers.teardown();
  });

  beforeEach(() => {
    vitestMockHelpers.reset();
  });

  describe('Price Feed Mocking', () => {
    it('should fetch ETH price data', async () => {
      const response = await fetch('http://localhost:3001/api/price/ETH');
      const data = await response.json();

      expect(data).toHaveProperty('token', 'ETH');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('change24h');
      expect(data).toHaveProperty('volume24h');
      expect(data).toHaveProperty('marketCap');

      expect(data.price).toBeGreaterThan(0);
      expect(data.volume24h).toBeGreaterThan(0);
    });

    it('should fetch historical prices', async () => {
      const response = await fetch('http://localhost:3001/api/price/ETH/history');
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const firstCandle = data[0];
      expect(firstCandle).toHaveProperty('timestamp');
      expect(firstCandle).toHaveProperty('price');
      expect(firstCandle).toHaveProperty('volume');
    });

    it('should fetch batch prices', async () => {
      const response = await fetch('http://localhost:3001/api/price/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: ['ETH', 'USDC', 'DAI'] }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('prices');
      expect(data.prices).toHaveProperty('ETH');
      expect(data.prices).toHaveProperty('USDC');
      expect(data.prices).toHaveProperty('DAI');
    });
  });

  describe('Liquidity Pool Mocking', () => {
    it('should fetch pool information', async () => {
      const response = await fetch('http://localhost:3001/api/pool/0x123');
      const data = await response.json();

      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('token0');
      expect(data).toHaveProperty('token1');
      expect(data).toHaveProperty('reserve0');
      expect(data).toHaveProperty('reserve1');
      expect(data).toHaveProperty('tvl');
      expect(data).toHaveProperty('apy');
      expect(data).toHaveProperty('fee');
    });

    it('should calculate swap quote', async () => {
      const response = await fetch('http://localhost:3001/api/pool/0x123/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountIn: '1000000000000000000',
          tokenIn: 'ETH',
          tokenOut: 'USDC',
        }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('amountIn');
      expect(data).toHaveProperty('amountOut');
      expect(data).toHaveProperty('priceImpact');
      expect(data).toHaveProperty('fee');
    });
  });

  describe('Transaction Mocking', () => {
    it('should submit transaction', async () => {
      const response = await fetch('http://localhost:3001/api/transaction/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '0x123',
          to: '0x456',
          value: '1000000000000000000',
        }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('hash');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('from');
      expect(data).toHaveProperty('to');
      expect(data.hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should simulate transaction', async () => {
      const response = await fetch('http://localhost:3001/api/transaction/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '0x123',
          to: '0x456',
          data: '0x',
        }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('gasUsed');
      expect(data).toHaveProperty('gasPrice');
      expect(data).toHaveProperty('totalCost');
      expect(data).toHaveProperty('changes');
      expect(Array.isArray(data.changes)).toBe(true);
    });
  });

  describe('Backtest Mocking', () => {
    it('should run backtest', async () => {
      const response = await fetch('http://localhost:3001/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: 'strategy-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('strategyId');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('trades');
      expect(data).toHaveProperty('equity');

      // Check metrics
      expect(data.metrics).toHaveProperty('totalReturn');
      expect(data.metrics).toHaveProperty('sharpeRatio');
      expect(data.metrics).toHaveProperty('maxDrawdown');
      expect(data.metrics).toHaveProperty('winRate');
      expect(data.metrics).toHaveProperty('profitFactor');

      // Check trades array
      expect(Array.isArray(data.trades)).toBe(true);
      if (data.trades.length > 0) {
        const trade = data.trades[0];
        expect(trade).toHaveProperty('timestamp');
        expect(trade).toHaveProperty('type');
        expect(trade).toHaveProperty('token');
        expect(trade).toHaveProperty('amount');
        expect(trade).toHaveProperty('price');
        expect(trade).toHaveProperty('pnl');
      }

      // Check equity curve
      expect(Array.isArray(data.equity)).toBe(true);
      if (data.equity.length > 0) {
        const point = data.equity[0];
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
      }
    });
  });

  describe('Scenario Testing', () => {
    it('should work in bull market scenario', async () => {
      const server = vitestMockHelpers.getServer();
      testScenarios.bullMarket(server);

      const response = await fetch('http://localhost:3001/api/price/ETH');
      const data = await response.json();

      // In bull market, prices should be elevated
      expect(data.price).toBeGreaterThan(1500);
    });

    it('should work in bear market scenario', async () => {
      const server = vitestMockHelpers.getServer();
      testScenarios.bearMarket(server);

      const response = await fetch('http://localhost:3001/api/price/ETH');
      const data = await response.json();

      // Bear market has lower prices
      // Note: Prices are still realistic, just adjusted down
      expect(data.price).toBeGreaterThan(0);
    });

    it('should simulate flash crash', async () => {
      const server = vitestMockHelpers.getServer();
      testScenarios.flashCrash(server);

      const response = await fetch('http://localhost:3001/api/price/ETH');
      const data = await response.json();

      // Flash crash causes significant drop
      expect(data.price).toBeLessThan(2000);
    });

    it('should simulate network congestion', async () => {
      const server = vitestMockHelpers.getServer();
      testScenarios.networkCongestion(server);

      const response = await fetch('http://localhost:3001/api/gas/prices');
      const data = await response.json();

      expect(data).toHaveProperty('slow');
      expect(data).toHaveProperty('standard');
      expect(data).toHaveProperty('fast');
      expect(data).toHaveProperty('instant');
    });
  });

  describe('Custom Mock Building', () => {
    it('should create custom mock with MockBuilder', async () => {
      const server = vitestMockHelpers.getServer();
      const mockBuilder = new MockBuilder(server);

      // Setup custom mock
      mockBuilder.when('GET', '/api/custom/test').thenReturn(200, {
        message: 'Custom mock response',
        timestamp: Date.now(),
      });

      const response = await fetch('http://localhost:3001/api/custom/test');
      const data = await response.json();

      expect(data.message).toBe('Custom mock response');
      expect(data).toHaveProperty('timestamp');

      // Verify the mock was called
      expect(mockBuilder.verify().wasCalledWith('GET', '/api/custom/test')).toBe(true);
      expect(mockBuilder.verify().wasCalledTimes('GET', '/api/custom/test', 1)).toBe(true);
    });

    it('should match request with body', async () => {
      const server = vitestMockHelpers.getServer();
      const mockBuilder = new MockBuilder(server);

      mockBuilder
        .when('POST', '/api/custom/swap')
        .withBody({ tokenIn: 'ETH', tokenOut: 'USDC' })
        .thenReturn(200, { success: true, amountOut: '2000' });

      const response = await fetch('http://localhost:3001/api/custom/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIn: 'ETH', tokenOut: 'USDC' }),
      });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.amountOut).toBe('2000');

      // Verify with body matcher
      expect(
        mockBuilder
          .verify()
          .wasCalledWith('POST', '/api/custom/swap', (body) => body.tokenIn === 'ETH')
      ).toBe(true);
    });

    it('should return error for specific conditions', async () => {
      const server = vitestMockHelpers.getServer();
      const mockBuilder = new MockBuilder(server);

      mockBuilder.when('POST', '/api/custom/transfer').thenReturn(400, {
        error: 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE',
      });

      const response = await fetch('http://localhost:3001/api/custom/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '1000' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Insufficient balance');
      expect(data.code).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('Request Verification', () => {
    it('should track request history', async () => {
      const server = vitestMockHelpers.getServer();

      // Make several requests
      await fetch('http://localhost:3001/api/price/ETH');
      await fetch('http://localhost:3001/api/price/USDC');
      await fetch('http://localhost:3001/api/pool/0x123');

      const requests = server.getRequests();

      expect(requests.length).toBeGreaterThanOrEqual(3);

      // Check ETH price request
      const ethPriceRequests = server.getRequests({
        method: 'GET',
        path: '/api/price/ETH',
      });
      expect(ethPriceRequests.length).toBe(1);
      expect(ethPriceRequests[0].method).toBe('GET');
      expect(ethPriceRequests[0].path).toBe('/api/price/ETH');
    });

    it('should verify specific requests were made', async () => {
      const server = vitestMockHelpers.getServer();
      const mockBuilder = new MockBuilder(server);

      // Make request
      await fetch('http://localhost:3001/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: 'test-123' }),
      });

      // Get the last request
      const lastRequest = mockBuilder.verify().getLastRequest('POST', '/api/backtest/run');

      expect(lastRequest).toBeDefined();
      expect(lastRequest?.body.strategyId).toBe('test-123');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch('http://localhost:3001/api/unknown/endpoint');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await fetch('http://localhost:3001/api/price/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      // Server should handle this gracefully (implementation dependent)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();

      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('scenario');
      expect(data).toHaveProperty('requestCount');
    });
  });

  describe('Admin Functions', () => {
    it('should change scenario via admin endpoint', async () => {
      const response = await fetch('http://localhost:3001/admin/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'bull_market' }),
      });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.scenario).toBe('bull_market');

      // Verify scenario changed
      const healthResponse = await fetch('http://localhost:3001/health');
      const health = await healthResponse.json();
      expect(health.scenario).toBe('bull_market');
    });

    it('should reset mock state via admin endpoint', async () => {
      // Make some requests
      await fetch('http://localhost:3001/api/price/ETH');
      await fetch('http://localhost:3001/api/price/USDC');

      // Reset
      const response = await fetch('http://localhost:3001/admin/reset', {
        method: 'POST',
      });
      const data = await response.json();

      expect(data.success).toBe(true);

      // Verify request count reset
      const healthResponse = await fetch('http://localhost:3001/health');
      const health = await healthResponse.json();
      expect(health.requestCount).toBe(1); // Only the health check itself
    });

    it('should retrieve request history via admin endpoint', async () => {
      // Make some requests
      await fetch('http://localhost:3001/api/price/ETH');
      await fetch('http://localhost:3001/api/pool/0x123');

      const response = await fetch('http://localhost:3001/admin/requests');
      const data = await response.json();

      expect(data).toHaveProperty('requests');
      expect(Array.isArray(data.requests)).toBe(true);
      expect(data.requests.length).toBeGreaterThanOrEqual(2);
    });
  });
});
