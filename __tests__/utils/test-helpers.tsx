/**
 * Shared Test Utilities
 * Common helpers and mocks for testing
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, vi } from 'vitest';

/**
 * Create a WebSocket client mock factory
 */
export function createWebSocketClientMock() {
  const priceCallbacks = new Map<string, Set<(data: any) => void>>();
  const statusCallbacks = new Set<(status: string) => void>();
  const alertCallbacks = new Set<(alert: any) => void>();

  const mockClient = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getStatus: vi.fn(() => 'connected' as const),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
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
    onAlert: vi.fn((callback: (alert: any) => void) => {
      alertCallbacks.add(callback);
      return () => {
        alertCallbacks.delete(callback);
      };
    }),
    // Test helpers
    _simulatePriceUpdate: (token: string, data: any) => {
      priceCallbacks.get(token)?.forEach((cb) => cb(data));
    },
    _simulateStatusChange: (status: string) => {
      statusCallbacks.forEach((cb) => cb(status));
    },
    _simulateAlert: (alert: any) => {
      alertCallbacks.forEach((cb) => cb(alert));
    },
  };

  return mockClient;
}

/**
 * Create a tRPC mock factory
 */
export function createTrpcMock() {
  const mockUseQuery = vi.fn();
  const mockUseMutation = vi.fn();

  return {
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    // Test helpers
    _setQueryData: (data: any) => {
      mockUseQuery.mockReturnValue({
        data,
        isLoading: false,
        refetch: vi.fn(),
      });
    },
    _setMutationResult: (result: any) => {
      mockUseMutation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue(result),
      });
    },
  };
}

/**
 * Create a React Query provider wrapper for tests
 */
export function createQueryClientWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/**
 * Wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 2000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Common assertion helpers
 */
export const testHelpers = {
  /**
   * Assert that a value is a valid number or undefined
   */
  expectNumberOrUndefined: (value: unknown) => {
    expect(value === undefined || typeof value === 'number').toBe(true);
  },

  /**
   * Assert that a value is a valid date or undefined
   */
  expectDateOrUndefined: (value: unknown) => {
    expect(value === undefined || value instanceof Date).toBe(true);
  },

  /**
   * Assert that a value is a valid string or null
   */
  expectStringOrNull: (value: unknown) => {
    expect(value === null || typeof value === 'string').toBe(true);
  },
};

