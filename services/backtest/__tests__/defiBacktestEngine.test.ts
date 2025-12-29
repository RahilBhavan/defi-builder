/**
 * Tests for DeFi backtest engine
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockCategory, type LegoBlock, Protocol } from '../../../types';
import { runDeFiBacktest } from '../../defiBacktestEngine';
import * as dataFetcher from '../dataFetcher';

// Mock the data fetcher
vi.mock('../dataFetcher', () => ({
  fetchMultipleTokenPrices: vi.fn(),
  getPriceAtTimestamp: vi.fn(),
}));

describe('DeFi Backtest Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error for empty strategy', async () => {
    await expect(
      runDeFiBacktest({
        blocks: [],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialCapital: 10000,
        rebalanceInterval: 86400000,
      })
    ).rejects.toThrow('Cannot backtest empty strategy');
  });

  it('should fetch price data for tokens in blocks', async () => {
    const mockPrices = new Map([
      ['ETH', [{ timestamp: Date.now(), price: 3000 }]],
      ['USDC', [{ timestamp: Date.now(), price: 1 }]],
    ]);

    vi.mocked(dataFetcher.fetchMultipleTokenPrices).mockResolvedValue(mockPrices);
    vi.mocked(dataFetcher.getPriceAtTimestamp).mockReturnValue(3000);

    const blocks: LegoBlock[] = [
      {
        id: '1',
        type: 'price_trigger',
        label: 'PRICE TRIGGER',
        description: 'Test',
        category: BlockCategory.ENTRY,
        protocol: Protocol.GENERIC,
        icon: 'trigger',
        params: {
          asset: 'ETH',
          targetPrice: 3000,
          condition: '>=',
        },
      },
    ];

    const result = await runDeFiBacktest({
      blocks,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      initialCapital: 10000,
      rebalanceInterval: 86400000,
    });

    expect(dataFetcher.fetchMultipleTokenPrices).toHaveBeenCalledWith(
      ['ETH'],
      expect.any(Date),
      expect.any(Date),
      'daily'
    );
    expect(result.metrics).toBeDefined();
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });

  it('should handle missing price data gracefully', async () => {
    const mockPrices = new Map();
    vi.mocked(dataFetcher.fetchMultipleTokenPrices).mockResolvedValue(mockPrices);

    const blocks: LegoBlock[] = [
      {
        id: '1',
        type: 'price_trigger',
        label: 'PRICE TRIGGER',
        description: 'Test',
        category: BlockCategory.ENTRY,
        protocol: Protocol.GENERIC,
        icon: 'trigger',
        params: {
          asset: 'ETH',
          targetPrice: 3000,
          condition: '>=',
        },
      },
    ];

    await expect(
      runDeFiBacktest({
        blocks,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        initialCapital: 10000,
        rebalanceInterval: 86400000,
      })
    ).rejects.toThrow('No price data fetched');
  });
});
