/**
 * Real-time Price Feed Service
 * Provides WebSocket-based price updates for tokens
 */

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

  /**
   * Connect to price feed WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = import.meta.env.VITE_PRICE_FEED_WS_URL || 'wss://api.coingecko.com/v3/ws';

    try {
      // For demo purposes, we'll simulate WebSocket with polling
      // In production, use a real WebSocket service like CoinGecko Pro, CryptoCompare, or custom
      this.startPolling();
    } catch (error) {
      console.error('Failed to connect to price feed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Start polling for price updates (fallback when WebSocket unavailable)
   */
  private startPolling(): void {
    // Poll every 5 seconds
    setInterval(() => {
      this.fetchPrices();
    }, 5000);

    // Initial fetch
    this.fetchPrices();
    this.isConnecting = false;
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
      console.error('Failed to fetch prices:', error);
    }
  }

  /**
   * Fetch prices from API (mock implementation)
   * Replace with real API call
   */
  private async fetchPricesFromAPI(tokens: string[]): Promise<Record<string, number>> {
    // Mock prices - in production, call CoinGecko, CryptoCompare, or your own API
    const mockPrices: Record<string, number> = {
      ETH: 2500 + Math.random() * 100 - 50,
      USDC: 1.0,
      DAI: 0.999 + Math.random() * 0.002,
      WBTC: 45000 + Math.random() * 2000 - 1000,
      USDT: 0.999 + Math.random() * 0.002,
    };

    const result: Record<string, number> = {};
    tokens.forEach((token) => {
      result[token] = mockPrices[token] || 0;
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
          console.error('Error in price update callback:', error);
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
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Disconnect from price feed
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }
}

// Singleton instance
export const priceFeedService = new PriceFeedService();
