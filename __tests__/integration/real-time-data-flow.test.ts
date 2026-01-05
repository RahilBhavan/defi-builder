/**
 * Real-Time Data Flow Integration Tests
 * Tests the complete flow from WebSocket connection to UI updates
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePositionMonitor } from '../../hooks/usePositionMonitor';
import { useMultiPriceFeed, usePriceFeed } from '../../hooks/usePriceFeed';

// Mock useMultiPriceFeed
vi.mock('../../hooks/usePriceFeed', async () => {
  const actual = await vi.importActual('../../hooks/usePriceFeed');
  return {
    ...actual,
    useMultiPriceFeed: vi.fn(),
  };
});

// Mock WebSocket client using shared test helpers
import { createWebSocketClientMock } from '../utils/test-helpers';

const mockWebSocketClient = createWebSocketClientMock();

vi.mock('../../lib/websocket/client', () => ({
  webSocketClient: mockWebSocketClient,
}));

describe('Real-Time Data Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Price Feed Flow', () => {
    it('should update price when WebSocket receives update', async () => {
      const { result } = renderHook(() => usePriceFeed('ETH'));

      // Simulate price update
      const wsClient = await import('../../lib/websocket/client');
      (wsClient.webSocketClient as any)._simulatePriceUpdate('ETH', 2500);

      await waitFor(() => {
        expect(result.current.price).toBe(2500);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle multiple token subscriptions', async () => {
      const { result } = renderHook(() => useMultiPriceFeed(['ETH', 'USDC']));

      // Simulate price updates
      const wsClient = await import('../../lib/websocket/client');
      (wsClient.webSocketClient as any)._simulatePriceUpdate('ETH', 2500);
      (wsClient.webSocketClient as any)._simulatePriceUpdate('USDC', 1.0);

      await waitFor(() => {
        expect(result.current.get('ETH')).toBe(2500);
        expect(result.current.get('USDC')).toBe(1.0);
      });
    });

    it('should update connection status', async () => {
      const { result } = renderHook(() => usePriceFeed('ETH'));

      // Simulate status change
      const wsClient = await import('../../lib/websocket/client');
      (wsClient.webSocketClient as any)._simulateStatusChange('disconnected');

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('closed');
      });
    });
  });

  describe('Position Monitoring Flow', () => {
    it('should calculate P&L from real-time prices', () => {
      const positions = [
        {
          asset: 'ETH',
          amount: 1.0,
          entryPrice: 2000,
          entryValue: 2000,
          timestamp: Date.now(),
        },
      ];

      // Mock useMultiPriceFeed to return price
      (useMultiPriceFeed as any).mockReturnValue(new Map([['ETH', 2500]]));

      const { result } = renderHook(() => usePositionMonitor(positions));

      // Verify P&L calculation
      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].pnl).toBe(500);
      expect(result.current.positions[0].pnlPercent).toBe(25);
      expect(result.current.totalPnL).toBe(500);
    });

    it('should handle empty positions', () => {
      (useMultiPriceFeed as any).mockReturnValue(new Map());

      const { result } = renderHook(() => usePositionMonitor([]));

      expect(result.current.positions).toHaveLength(0);
      expect(result.current.totalPnL).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing prices in position monitoring', () => {
      const positions = [
        {
          asset: 'ETH',
          amount: 1.0,
          entryPrice: 2000,
          entryValue: 2000,
          timestamp: Date.now(),
        },
      ];

      (useMultiPriceFeed as any).mockReturnValue(new Map([['ETH', undefined]]));

      const { result } = renderHook(() => usePositionMonitor(positions));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.positions[0].currentPrice).toBe(0);
    });

    it('should handle null token in price feed', () => {
      const { result } = renderHook(() => usePriceFeed(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.price).toBeUndefined();
      expect(mockWebSocketClient.onPriceUpdate).not.toHaveBeenCalled();
    });
  });
});
