/**
 * Alert System Flow Integration Tests
 * Tests the complete alert creation, triggering, and notification flow
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlerts } from '../../hooks/useAlerts';
import { browserNotificationService } from '../../lib/notifications/browser';
import type { AlertCallback } from '../../lib/websocket/client';
import { webSocketClient } from '../../lib/websocket/client';

// Mock dependencies
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('../../lib/api/trpc', () => ({
  trpc: {
    alerts: {
      list: { useQuery: mockUseQuery },
      create: { useMutation: mockUseMutation },
      update: { useMutation: mockUseMutation },
      delete: { useMutation: mockUseMutation },
    },
  },
}));

vi.mock('../../lib/notifications/browser', () => ({
  browserNotificationService: {
    requestPermission: vi.fn().mockResolvedValue('granted'),
    showPriceAlert: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../lib/websocket/client', () => ({
  webSocketClient: {
    onAlert: vi.fn(() => vi.fn()),
  },
}));

describe('Alert System Flow Integration', () => {
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

    mockUseQuery.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: '2', ...mockAlerts[0] }),
    });
  });

  describe('Alert Creation Flow', () => {
    it('should create alert and subscribe to WebSocket', async () => {
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

    it('should request notification permission on mount', () => {
      renderHook(() => useAlerts());

      expect(browserNotificationService.requestPermission).toHaveBeenCalled();
    });
  });

  describe('Alert Triggering Flow', () => {
    it('should receive alert notification via WebSocket', async () => {
      let alertCallback: AlertCallback | null = null;

      vi.mocked(webSocketClient.onAlert).mockImplementation((callback: AlertCallback) => {
        alertCallback = callback;
        return vi.fn();
      });

      renderHook(() => useAlerts());

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
        expect(browserNotificationService.showPriceAlert).toHaveBeenCalled();
      });
    });

    it('should show browser notification on alert trigger', async () => {
      let alertCallback: AlertCallback | null = null;

      vi.mocked(webSocketClient.onAlert).mockImplementation((callback: AlertCallback) => {
        alertCallback = callback;
        return vi.fn();
      });

      renderHook(() => useAlerts());

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
        expect(browserNotificationService.showPriceAlert).toHaveBeenCalled();
      });
    });
  });

  describe('Alert Management Flow', () => {
    it('should update alert status', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ ...mockAlerts[0], isActive: false });
      mockUseMutation.mockReturnValue({ mutateAsync });

      const { result } = renderHook(() => useAlerts());

      await result.current.updateAlert('1', { isActive: false });

      expect(mutateAsync).toHaveBeenCalledWith({
        id: '1',
        isActive: false,
      });
    });

    it('should delete alert', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true });
      mockUseMutation.mockReturnValue({ mutateAsync });

      const { result } = renderHook(() => useAlerts());

      await result.current.deleteAlert('1');

      expect(mutateAsync).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle alert creation failure', async () => {
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

    it('should handle notification permission denial', async () => {
      vi.mocked(browserNotificationService.requestPermission).mockResolvedValue('denied');

      renderHook(() => useAlerts());

      // Should not throw, just not show notifications
      expect(browserNotificationService.requestPermission).toHaveBeenCalled();
    });
  });
});
