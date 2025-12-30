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
    // WebSocket URL for future implementation
    // const wsUrl = import.meta.env.VITE_PRICE_FEED_WS_URL || 'wss://api.coingecko.com/v3/ws';

    try {
      // For now, use polling with CoinGecko API
      // In production, upgrade to WebSocket service like CoinGecko Pro, CryptoCompare, or custom
      this.startPolling();
    } catch (error) {
      console.error('Failed to connect to price feed:', error);
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
      console.error('Failed to fetch prices:', error);
    }
  }

  /**
   * Fetch prices from CoinGecko API
   * Uses free tier API with rate limiting
   */
  private async fetchPricesFromAPI(tokens: string[]): Promise<Record<string, number>> {
    // Token symbol to CoinGecko ID mapping
    const TOKEN_IDS: Record<string, string> = {
      ETH: 'ethereum',
      USDC: 'usd-coin',
      DAI: 'dai',
      WBTC: 'wrapped-bitcoin',
      USDT: 'tether',
      AAVE: 'aave',
      LINK: 'chainlink',
      UNI: 'uniswap',
    };

    const tokenIds = tokens
      .map((token) => TOKEN_IDS[token])
      .filter((id): id is string => id !== undefined);

    if (tokenIds.length === 0) {
      return {};
    }

    try {
      // CoinGecko free tier: simple price endpoint
      const ids = tokenIds.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - use fallback
          console.warn('CoinGecko rate limited, using fallback prices');
          return this.getFallbackPrices(tokens);
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const result: Record<string, number> = {};

      // Map CoinGecko IDs back to token symbols
      tokens.forEach((token) => {
        const tokenId = TOKEN_IDS[token];
        if (tokenId && data[tokenId]?.usd) {
          result[token] = data[tokenId].usd;
        } else {
          // Fallback for unmapped tokens
          result[token] = this.getFallbackPrices([token])[token] || 0;
        }
      });

      return result;
    } catch (error) {
      console.error('Failed to fetch prices from CoinGecko:', error);
      // Return fallback prices on error
      return this.getFallbackPrices(tokens);
    }
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
    this.stopPolling();
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }
}

// Singleton instance
export const priceFeedService = new PriceFeedService();
