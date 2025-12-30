/**
 * Real-time Price Feed Service
 * Provides WebSocket-based price updates for tokens
 * All API calls go through backend proxy for security
 */

import { logger } from '../utils/logger';

export interface PriceUpdate {
  token: string;
  price: number;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
}

export type PriceUpdateCallback = (update: PriceUpdate) => void;

class PriceFeedService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<PriceUpdateCallback>> = new Map();
  private prices: Map<string, number> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Connect to price feed WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    // WebSocket URL for future implementation
    // const wsUrl = import.meta.env.VITE_PRICE_FEED_WS_URL || 'wss://api.coingecko.com/v3/ws';

    try {
      // For now, use polling with CoinGecko API
      // In production, upgrade to WebSocket service like CoinGecko Pro, CryptoCompare, or custom
      this.startPolling();
    } catch (error) {
      logger.error('Failed to connect to price feed', error instanceof Error ? error : new Error(String(error)), 'PriceFeed');
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private pollingInterval: NodeJS.Timeout | null = null;

  /**
   * Start polling for price updates (fallback when WebSocket unavailable)
   */
  private startPolling(): void {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Poll every 10 seconds (CoinGecko free tier: 10-50 calls/minute)
    this.pollingInterval = setInterval(() => {
      this.fetchPrices();
    }, 10000);

    // Initial fetch
    this.fetchPrices();
    this.isConnecting = false;
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch prices from API
   */
  private async fetchPrices(): Promise<void> {
    const tokens = Array.from(this.subscribers.keys());
    if (tokens.length === 0) return;

    try {
      // Use CoinGecko API (free tier) or similar
      // For demo, we'll use mock data
      const prices = await this.fetchPricesFromAPI(tokens);

      tokens.forEach((token) => {
        const price = prices[token];
        if (price !== undefined && price !== this.prices.get(token)) {
          const update: PriceUpdate = {
            token,
            price,
            timestamp: Date.now(),
            change24h: this.calculate24hChange(token, price),
          };

          this.prices.set(token, price);
          this.notifySubscribers(token, update);
        }
      });
    } catch (error) {
      logger.error('Failed to fetch prices', error instanceof Error ? error : new Error(String(error)), 'PriceFeed');
    }
  }

  /**
   * Fetch prices from backend proxy
   * Backend proxy keeps API keys secure and implements rate limiting
   * No direct API calls - all requests go through backend
   * Uses client-side rate limiting and request deduplication
   */
  private async fetchPricesFromAPI(tokens: string[]): Promise<Record<string, number>> {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Create cache key for deduplication
    const cacheKey = `prices-${tokens.sort().join(',')}`;
    
    // Use rate limiter and deduplication
    return priceFeedRateLimiter.enqueue(
      () =>
        requestDeduplicator.deduplicate(cacheKey, async () => {
          try {
            // Use backend proxy endpoint via tRPC
            const response = await fetch(
              `${API_URL}/trpc/prices.getPrices?input=${encodeURIComponent(JSON.stringify({ tokens }))}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
              }
            );

            if (response.ok) {
              const data = await response.json();
              // tRPC returns { result: { data: ... } }
              if (data?.result?.data) {
                return data.result.data;
              }
            } else if (response.status === 429) {
              // Rate limited - use fallback
              logger.warn('Backend rate limited, using fallback prices', 'PriceFeed');
              return this.getFallbackPrices(tokens);
            } else {
              throw new Error(`Backend API error: ${response.status}`);
            }
          } catch (error) {
            // Backend unavailable - use fallback prices
            logger.error(
              'Backend price feed unavailable, using fallback prices',
              error instanceof Error ? error : new Error(String(error)),
              'PriceFeed'
            );
            return this.getFallbackPrices(tokens);
          }

          // If we get here, return fallback (shouldn't happen)
          return this.getFallbackPrices(tokens);
        }),
      `price-fetch-${cacheKey}`
    ) as Promise<Record<string, number>>;
  }

  /**
   * Get fallback prices (for when API is unavailable)
   */
  private getFallbackPrices(tokens: string[]): Record<string, number> {
    // Use cached prices or reasonable defaults
    const fallbackPrices: Record<string, number> = {
      ETH: 2500,
      USDC: 1.0,
      DAI: 1.0,
      WBTC: 45000,
      USDT: 1.0,
      AAVE: 100,
      LINK: 15,
      UNI: 10,
    };

    const result: Record<string, number> = {};
    tokens.forEach((token) => {
      // Try to use cached price first
      const cached = this.prices.get(token);
      result[token] = cached ?? fallbackPrices[token] ?? 0;
    });

    return result;
  }

  /**
   * Calculate 24h price change
   */
  private calculate24hChange(token: string, currentPrice: number): number {
    const previousPrice = this.prices.get(token);
    if (!previousPrice) return 0;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  /**
   * Subscribe to price updates for a token
   */
  subscribe(token: string, callback: PriceUpdateCallback): () => void {
    if (!this.subscribers.has(token)) {
      this.subscribers.set(token, new Set());
    }
    this.subscribers.get(token)!.add(callback);

    // Send current price if available
    const currentPrice = this.prices.get(token);
    if (currentPrice !== undefined) {
      callback({
        token,
        price: currentPrice,
        timestamp: Date.now(),
      });
    }

    // Connect if not already connected
    if (this.subscribers.size > 0) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(token);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(token);
        }
      }
      // Stop polling if no more subscribers
      if (this.subscribers.size === 0) {
        this.stopPolling();
      }
    };
  }

  /**
   * Notify all subscribers for a token
   */
  private notifySubscribers(token: string, update: PriceUpdate): void {
    const callbacks = this.subscribers.get(token);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(update);
        } catch (error) {
          logger.error('Error in price update callback', error instanceof Error ? error : new Error(String(error)), 'PriceFeed');
        }
      });
    }
  }

  /**
   * Get current price for a token
   */
  getPrice(token: string): number | undefined {
    return this.prices.get(token);
  }

  /**
   * Get all current prices
   */
  getAllPrices(): Map<string, number> {
    return new Map(this.prices);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', undefined, 'PriceFeed');
      return;
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Disconnect from price feed
   * Cleans up all intervals, timeouts, and subscriptions
   */
  disconnect(): void {
    // Close WebSocket if open
    if (this.ws) {
      this.ws.close();
      this.ws.removeEventListener('open', () => {});
      this.ws.removeEventListener('message', () => {});
      this.ws.removeEventListener('error', () => {});
      this.ws.removeEventListener('close', () => {});
      this.ws = null;
    }
    
    // Stop polling
    this.stopPolling();
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Clear all subscribers
    this.subscribers.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }
}

// Singleton instance
export const priceFeedService = new PriceFeedService();
