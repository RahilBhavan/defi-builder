/**
 * Price Feed Hook
 * Provides real-time price updates via WebSocket
 */

import { useEffect, useRef, useState } from 'react';
import { logger } from '../lib/monitoring/logger';
import { type ConnectionStatus, webSocketClient } from '../lib/websocket/client';

export interface UsePriceFeedResult {
  price: number | undefined;
  isLoading: boolean;
  error: Error | null;
  connectionStatus: ConnectionStatus;
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * Hook for subscribing to real-time price updates for a single token
 */
export function usePriceFeed(token: string | null): UsePriceFeedResult {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Connect WebSocket if not connected
    if (webSocketClient.getStatus() === 'disconnected') {
      webSocketClient.connect();
    }

    // Subscribe to connection status changes
    const statusUnsubscribe = webSocketClient.onStatusChange((status) => {
      setConnectionStatus(status);
      setIsLoading(status === 'connecting' || status === 'reconnecting');
    });

    return () => {
      statusUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setPrice(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to price updates
    const unsubscribe = webSocketClient.onPriceUpdate(token, (update) => {
      setPrice(update.price);
      setIsLoading(false);
      setError(null);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [token]);

  const subscribe = () => {
    if (token) {
      webSocketClient.subscribe([token]);
    }
  };

  const unsubscribe = () => {
    if (token && unsubscribeRef.current) {
      unsubscribeRef.current();
    }
  };

  return {
    price,
    isLoading,
    error,
    connectionStatus,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for subscribing to real-time price updates for multiple tokens
 */
export function useMultiPriceFeed(tokens: string[]): Map<string, number | undefined> {
  const [prices, setPrices] = useState<Map<string, number | undefined>>(new Map());
  const unsubscribeRefs = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    // Connect WebSocket if not connected
    if (webSocketClient.getStatus() === 'disconnected') {
      webSocketClient.connect();
    }
  }, []);

  useEffect(() => {
    // Initialize prices map
    const newPrices = new Map<string, number | undefined>();
    tokens.forEach((token) => {
      newPrices.set(token, undefined);
    });
    setPrices(newPrices);

    // Subscribe to all tokens
    tokens.forEach((token) => {
      const unsubscribe = webSocketClient.onPriceUpdate(token, (update) => {
        setPrices((prev) => {
          const updated = new Map(prev);
          updated.set(update.token, update.price);
          return updated;
        });
      });

      unsubscribeRefs.current.set(token, unsubscribe);
    });

    return () => {
      // Unsubscribe from all tokens
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current.clear();
    };
  }, [tokens.join(',')]); // Re-run when token list changes

  return prices;
}

/**
 * Hook for WebSocket connection status
 */
export function useWebSocketStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(webSocketClient.getStatus());

  useEffect(() => {
    // Connect if disconnected
    if (status === 'disconnected') {
      webSocketClient.connect();
    }

    const unsubscribe = webSocketClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
