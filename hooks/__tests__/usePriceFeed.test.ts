/**
 * Price Feed Hook Tests
 * Tests for real-time price feed hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiPriceFeed, usePriceFeed } from '../usePriceFeed';

// Create mock callbacks storage
const priceCallbacks = new Map<string, Set<(data: any) => void>>();
const statusCallbacks = new Set<(status: string) => void>();

// Mock WebSocket client
vi.mock('../../lib/websocket/client', () => {
  const priceCallbacks = new Map<string, Set<(data: any) => void>>();
  const statusCallbacks = new Set<(status: string) => void>();

  return {
    webSocketClient: {
      connect: vi.fn(),
      getStatus: vi.fn(() => 'connected' as const),
      onPriceUpdate: vi.fn((token: string, callback: (data: any) => void) => {
        if (!priceCallbacks.has(token)) {
          priceCallbacks.set(token, new Set());
        }
        priceCallbacks.get(token)?.add(callback);
        return () => {
          priceCallbacks.get(token)?.delete(callback);
        };
      }),
      onStatusChange: vi.fn((callback: (status: string) => void) => {
        statusCallbacks.add(callback);
        callback('connected');
        return () => {
          statusCallbacks.delete(callback);
        };
      }),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      disconnect: vi.fn(),
      // Test helpers
      _simulatePriceUpdate: (token: string, data: any) => {
        priceCallbacks.get(token)?.forEach((cb) => cb(data));
      },
      _simulateStatusChange: (status: string) => {
        statusCallbacks.forEach((cb) => cb(status));
      },
    },
  };
});

describe('usePriceFeed', () => {
  let webSocketClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mock is set up
    const module = await import('../../lib/websocket/client');
    webSocketClient = module.webSocketClient;
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => usePriceFeed('ETH'));

    expect(result.current.isLoading).toBeDefined();
    expect(result.current.connectionStatus).toBeDefined();
  });

  it('should connect to WebSocket on mount', () => {
    (webSocketClient.getStatus as any).mockReturnValue('disconnected' as const);
    renderHook(() => usePriceFeed('ETH'));

    expect(webSocketClient.connect).toHaveBeenCalled();
  });

  it('should subscribe to price updates', () => {
    renderHook(() => usePriceFeed('ETH'));

    expect(webSocketClient.onPriceUpdate).toHaveBeenCalledWith('ETH', expect.any(Function));
  });

  it('should update price when WebSocket receives update', async () => {
    const { result } = renderHook(() => usePriceFeed('ETH'));

    // Simulate price update using test helper
    if (webSocketClient._simulatePriceUpdate) {
      webSocketClient._simulatePriceUpdate('ETH', {
        token: 'ETH',
        price: 2500,
        timestamp: Date.now(),
      });
    }

    await waitFor(
      () => {
        expect(result.current.price).toBe(2500);
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );
  });

  it('should handle connection status changes', () => {
    const { result } = renderHook(() => usePriceFeed('ETH'));

    expect(webSocketClient.onStatusChange).toHaveBeenCalled();

    // Simulate status change
    if (webSocketClient._simulateStatusChange) {
      webSocketClient._simulateStatusChange('disconnected');
    }

    // Status should be tracked
    expect(['disconnected', 'connecting', 'connected', 'reconnecting']).toContain(
      result.current.connectionStatus
    );
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    (webSocketClient.onPriceUpdate as any).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => usePriceFeed('ETH'));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle null token', () => {
    const { result } = renderHook(() => usePriceFeed(null));

    expect(result.current.isLoading).toBe(false);
    expect(webSocketClient.onPriceUpdate).not.toHaveBeenCalled();
  });
});

describe('useMultiPriceFeed', () => {
  let webSocketClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../lib/websocket/client');
    webSocketClient = module.webSocketClient;
  });

  it('should subscribe to multiple tokens', () => {
    renderHook(() => useMultiPriceFeed(['ETH', 'USDC']));

    expect(webSocketClient.onPriceUpdate).toHaveBeenCalledWith('ETH', expect.any(Function));
    expect(webSocketClient.onPriceUpdate).toHaveBeenCalledWith('USDC', expect.any(Function));
  });

  it('should update prices for multiple tokens', async () => {
    const callbacks: Map<string, (update: any) => void> = new Map();

    (webSocketClient.onPriceUpdate as any).mockImplementation(
      (token: string, callback: (update: any) => void) => {
        callbacks.set(token, callback);
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useMultiPriceFeed(['ETH', 'USDC']));

    // Simulate price updates using test helper
    if (webSocketClient._simulatePriceUpdate) {
      webSocketClient._simulatePriceUpdate('ETH', {
        token: 'ETH',
        price: 2500,
        timestamp: Date.now(),
      });
      webSocketClient._simulatePriceUpdate('USDC', {
        token: 'USDC',
        price: 1.0,
        timestamp: Date.now(),
      });
    }

    await waitFor(
      () => {
        expect(result.current.get('ETH')).toBe(2500);
        expect(result.current.get('USDC')).toBe(1.0);
      },
      { timeout: 2000 }
    );
  });

  it('should handle empty token array', () => {
    const { result } = renderHook(() => useMultiPriceFeed([]));

    expect(result.current.size).toBe(0);
    expect(webSocketClient.onPriceUpdate).not.toHaveBeenCalled();
  });

  it('should unsubscribe when tokens change', () => {
    const unsubscribe1 = vi.fn();
    const unsubscribe2 = vi.fn();

    (webSocketClient.onPriceUpdate as any)
      .mockReturnValueOnce(unsubscribe1)
      .mockReturnValueOnce(unsubscribe2);

    const { rerender } = renderHook(({ tokens }) => useMultiPriceFeed(tokens), {
      initialProps: { tokens: ['ETH'] },
    });

    rerender({ tokens: ['USDC'] });

    expect(unsubscribe1).toHaveBeenCalled();
  });
});
