/**
 * Alerts Hook Tests
 * Tests for alert management and real-time notifications
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trpc } from '../../lib/api/trpc';
import { browserNotificationService } from '../../lib/notifications/browser';
import { webSocketClient } from '../../lib/websocket/client';
import { useAlerts } from '../useAlerts';
import { useToast } from '../useToast';

// Mock dependencies
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('../../lib/api/trpc', () => ({
  trpc: {
    alerts: {
      list: {
        useQuery: mockUseQuery,
      },
      create: {
        useMutation: mockUseMutation,
      },
      update: {
        useMutation: mockUseMutation,
      },
      delete: {
        useMutation: mockUseMutation,
      },
    },
  },
}));

vi.mock('../../lib/notifications/browser', () => ({
  browserNotificationService: {
    requestPermission: vi.fn(),
    showPriceAlert: vi.fn(),
    show: vi.fn(),
  },
}));

vi.mock('../../lib/websocket/client', () => ({
  webSocketClient: {
    onAlert: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../useToast', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('useAlerts', () => {
  const mockAlerts = [
    {
      id: '1',
      name: 'ETH Price Alert',
      type: 'price' as const,
      condition: { operator: 'gt' as const, value: 2500, field: 'price', token: 'ETH' },
      isActive: true,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseQuery.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('should request notification permission on mount', () => {
    renderHook(() => useAlerts());

    expect(browserNotificationService.requestPermission).toHaveBeenCalled();
  });

  it('should return alerts from query', () => {
    const { result } = renderHook(() => useAlerts());

    expect(result.current.alerts).toEqual(mockAlerts);
    expect(result.current.isLoading).toBe(false);
  });

  it('should create alert successfully', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: '2', ...mockAlerts[0] });
    mockUseMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useAlerts());

    await result.current.createAlert({
      name: 'New Alert',
      type: 'price',
      condition: { operator: 'gt', value: 3000, field: 'price', token: 'ETH' },
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'New Alert',
      type: 'price',
      condition: { operator: 'gt', value: 3000, field: 'price', token: 'ETH' },
    });
  });

  it('should update alert successfully', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ...mockAlerts[0], isActive: false });
    mockUseMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useAlerts());

    await result.current.updateAlert('1', { isActive: false });

    expect(mutateAsync).toHaveBeenCalledWith({ id: '1', isActive: false });
  });

  it('should delete alert successfully', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useAlerts());

    await result.current.deleteAlert('1');

    expect(mutateAsync).toHaveBeenCalledWith({ id: '1' });
  });

  it('should handle alert notifications via WebSocket', async () => {
    let alertCallback: ((alert: any) => void) | null = null;

    vi.mocked(webSocketClient.onAlert).mockImplementation((callback) => {
      alertCallback = callback;
      return vi.fn();
    });

    const { result } = renderHook(() => useAlerts());

    // Simulate alert trigger
    if (alertCallback) {
      alertCallback({
        alertId: '1',
        alertName: 'ETH Price Alert',
        type: 'price',
        token: 'ETH',
        price: 2600,
        condition: { operator: 'gt', value: 2500 },
      });
    }

    await waitFor(() => {
      expect(browserNotificationService.showPriceAlert).toHaveBeenCalledWith(
        'ETH',
        2600,
        'ETH Price Alert'
      );
    });
  });

  it('should handle non-price alert notifications', async () => {
    let alertCallback: ((alert: any) => void) | null = null;

    vi.mocked(webSocketClient.onAlert).mockImplementation((callback) => {
      alertCallback = callback;
      return vi.fn();
    });

    renderHook(() => useAlerts());

    // Simulate non-price alert trigger
    if (alertCallback) {
      alertCallback({
        alertId: '1',
        alertName: 'Position Alert',
        type: 'position',
        condition: { operator: 'gt', value: 1000 },
      });
    }

    await waitFor(() => {
      expect(browserNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Alert: Position Alert',
          body: 'Alert condition met: Position Alert',
        })
      );
    });
  });

  it('should handle create alert error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Failed to create'));
    mockUseMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useAlerts());

    await expect(
      result.current.createAlert({
        name: 'New Alert',
        type: 'price',
        condition: { operator: 'gt', value: 3000, field: 'price', token: 'ETH' },
      })
    ).rejects.toThrow('Failed to create');
  });
});
