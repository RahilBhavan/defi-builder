/**
 * Position Monitor Hook Tests
 * Tests for real-time position monitoring
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Position, usePositionMonitor } from '../usePositionMonitor';
import { useMultiPriceFeed } from '../usePriceFeed';

// Mock useMultiPriceFeed
vi.mock('../usePriceFeed', () => ({
  useMultiPriceFeed: vi.fn(),
}));

describe('usePositionMonitor', () => {
  const mockPositions: Position[] = [
    {
      asset: 'ETH',
      amount: 1.0,
      entryPrice: 2000,
      entryValue: 2000,
      timestamp: Date.now(),
    },
    {
      asset: 'USDC',
      amount: 1000,
      entryPrice: 1.0,
      entryValue: 1000,
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate P&L for positions', () => {
    const mockPrices = new Map([
      ['ETH', 2500],
      ['USDC', 1.0],
    ]);

    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result } = renderHook(() => usePositionMonitor(mockPositions));

    expect(result.current.positions).toHaveLength(2);

    const ethPosition = result.current.positions.find((p) => p.asset === 'ETH');
    expect(ethPosition?.currentPrice).toBe(2500);
    expect(ethPosition?.currentValue).toBe(2500);
    expect(ethPosition?.pnl).toBe(500);
    expect(ethPosition?.pnlPercent).toBe(25);
    expect(ethPosition?.isProfit).toBe(true);
  });

  it('should calculate total P&L', () => {
    const mockPrices = new Map([
      ['ETH', 2500],
      ['USDC', 1.0],
    ]);

    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result } = renderHook(() => usePositionMonitor(mockPositions));

    // ETH: +500, USDC: 0
    expect(result.current.totalPnL).toBe(500);
    expect(result.current.totalPnLPercent).toBeCloseTo(16.67, 2);
  });

  it('should handle missing prices', () => {
    const mockPrices = new Map([
      ['ETH', undefined],
      ['USDC', 1.0],
    ]);

    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result } = renderHook(() => usePositionMonitor(mockPositions));

    const ethPosition = result.current.positions.find((p) => p.asset === 'ETH');
    expect(ethPosition?.currentPrice).toBe(0);
    expect(ethPosition?.currentValue).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle empty positions', () => {
    const mockPrices = new Map();
    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result } = renderHook(() => usePositionMonitor([]));

    expect(result.current.positions).toHaveLength(0);
    expect(result.current.totalPnL).toBe(0);
    expect(result.current.totalValue).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should calculate negative P&L', () => {
    const mockPrices = new Map([['ETH', 1500]]);
    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result } = renderHook(() => usePositionMonitor([mockPositions[0]]));

    const position = result.current.positions[0];
    expect(position.pnl).toBe(-500);
    expect(position.pnlPercent).toBe(-25);
    expect(position.isProfit).toBe(false);
  });

  it('should update when prices change', async () => {
    const mockPrices = new Map([['ETH', 2000]]);
    vi.mocked(useMultiPriceFeed).mockReturnValue(mockPrices);

    const { result, rerender } = renderHook(() => usePositionMonitor([mockPositions[0]]));

    expect(result.current.positions[0].pnl).toBe(0);

    // Update price
    const newPrices = new Map([['ETH', 2500]]);
    vi.mocked(useMultiPriceFeed).mockReturnValue(newPrices);
    rerender();

    await waitFor(() => {
      expect(result.current.positions[0].pnl).toBe(500);
    });
  });
});
