/**
 * Alerts Hook
 * Manages alerts and handles real-time alert notifications
 */

import { useEffect, useState } from 'react';
import { trpc } from '../lib/api/trpc';
import { browserNotificationService } from '../lib/notifications/browser';
import { webSocketClient } from '../lib/websocket/client';
import { useToast } from './useToast';

// Type assertion for tRPC nested router
// biome-ignore lint/suspicious/noExplicitAny: tRPC router type inference issue
const typedTrpc = trpc as any;

export interface Alert {
  id: string;
  name: string;
  type: 'price' | 'position' | 'strategy' | 'time';
  condition: {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: number | string;
    field: string;
    token?: string;
  };
  isActive: boolean;
  triggerCount: number;
  lastTriggeredAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function useAlerts() {
  const { success: showSuccess, error: showError } = useToast();
  const { data: alerts, isLoading, refetch } = typedTrpc.alerts.list.useQuery();

  // Request notification permission on mount
  useEffect(() => {
    browserNotificationService.requestPermission().catch(() => {
      // Permission denied or not supported - that's okay
    });
  }, []);

  // Listen for alert notifications via WebSocket
  useEffect(() => {
    const unsubscribe = webSocketClient.onAlert((alertData) => {
      const alert = alerts?.find((a: Alert) => a.id === alertData.alertId);
      if (!alert) return;

      // Show browser notification
      if (alert.type === 'price' && alertData.token && alertData.price !== undefined) {
        browserNotificationService
          .showPriceAlert(alertData.token, alertData.price, alert.name)
          .catch(() => {
            // Notification failed - that's okay
          });
      } else {
        browserNotificationService
          .show({
            title: `Alert: ${alert.name}`,
            body: `Alert condition met: ${alert.name}`,
            tag: `alert-${alert.id}`,
          })
          .catch(() => {
            // Notification failed - that's okay
          });
      }

      // Show toast notification
      showSuccess(`Alert triggered: ${alert.name}`);

      // Refresh alerts to update trigger count
      refetch();
    });

    return unsubscribe;
  }, [alerts, showSuccess, refetch]);

  const createMutation = typedTrpc.alerts.create.useMutation();
  const updateMutation = typedTrpc.alerts.update.useMutation();
  const deleteMutation = typedTrpc.alerts.delete.useMutation();

  const createAlert = async (data: {
    name: string;
    type: 'price' | 'position' | 'strategy' | 'time';
    condition: Alert['condition'];
  }) => {
    try {
      await createMutation.mutateAsync(data);
      showSuccess('Alert created successfully');
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create alert');
      throw error;
    }
  };

  const updateAlert = async (
    id: string,
    data: {
      name?: string;
      condition?: Alert['condition'];
      isActive?: boolean;
    }
  ) => {
    try {
      await updateMutation.mutateAsync({ id, ...data });
      showSuccess('Alert updated successfully');
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update alert');
      throw error;
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      showSuccess('Alert deleted successfully');
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete alert');
      throw error;
    }
  };

  return {
    alerts: alerts || [],
    isLoading,
    createAlert,
    updateAlert,
    deleteAlert,
    refetch,
  };
}
