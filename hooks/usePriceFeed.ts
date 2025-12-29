/**
 * usePriceFeed Hook
 * Subscribe to real-time price updates for tokens
 */

import { useCallback, useEffect, useState } from 'react';
import { type PriceUpdate, priceFeedService } from '../services/priceFeed';

export interface UsePriceFeedResult {
  price: number | undefined;
  update: PriceUpdate | null;
  isLoading: boolean;
  error: Error | null;
  subscribe: (token: string) => void;
  unsubscribe: () => void;
}

/**
 * Hook to subscribe to price updates for a single token
 */
export function usePriceFeed(token: string | null): UsePriceFeedResult {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [update, setUpdate] = useState<PriceUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const callback = (update: PriceUpdate) => {
      setPrice(update.price);
      setUpdate(update);
      setIsLoading(false);
    };

    const unsubscribe = priceFeedService.subscribe(token, callback);

    // Get initial price
    const initialPrice = priceFeedService.getPrice(token);
    if (initialPrice !== undefined) {
      setPrice(initialPrice);
      setIsLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, [token]);

  const subscribe = useCallback((newToken: string) => {
    // This will trigger the useEffect above
  }, []);

  const unsubscribe = useCallback(() => {
    // Cleanup handled by useEffect
  }, []);

  return {
    price,
    update,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook to subscribe to multiple tokens
 */
export function useMultiPriceFeed(tokens: string[]): Map<string, number | undefined> {
  const [prices, setPrices] = useState<Map<string, number | undefined>>(new Map());

  useEffect(() => {
    if (tokens.length === 0) return;

    const callbacks = new Map<string, (update: PriceUpdate) => void>();
    const unsubscribes: Array<() => void> = [];

    tokens.forEach((token) => {
      const callback = (update: PriceUpdate) => {
        setPrices((prev) => {
          const next = new Map(prev);
          next.set(token, update.price);
          return next;
        });
      };
      callbacks.set(token, callback);
      const unsubscribe = priceFeedService.subscribe(token, callback);
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [tokens.join(',')]);

  return prices;
}
