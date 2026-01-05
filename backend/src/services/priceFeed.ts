/**
 * Price Feed Service (Backend)
 * Proxy service for CoinGecko API to keep API keys server-side
 * Implements rate limiting, caching, and WebSocket subscriptions
 */

import { logger } from '../utils/logger';

interface PriceResponse {
  [tokenId: string]: {
    usd: number;
  };
}

export interface PriceUpdate {
  token: string;
  price: number;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
}

export type PriceUpdateCallback = (update: PriceUpdate) => void;

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

// Simple in-memory cache with TTL
interface CacheEntry {
  data: Record<string, number>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 1 minute

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (CoinGecko free tier: 10-50 calls/minute)

// Subscription management
const subscribers: Map<string, Set<PriceUpdateCallback>> = new Map();
const subscribedTokens: Set<string> = new Set();
let pollingInterval: NodeJS.Timeout | null = null;
const POLLING_INTERVAL = 10000; // 10 seconds

/**
 * Subscribe to price updates for tokens
 */
export function subscribe(tokens: string[], callback: PriceUpdateCallback): void {
  tokens.forEach((token) => {
    if (!subscribers.has(token)) {
      subscribers.set(token, new Set());
    }
    subscribers.get(token)?.add(callback);
    subscribedTokens.add(token);
  });

  // Start polling if not already started
  if (pollingInterval === null && subscribedTokens.size > 0) {
    startPolling();
  }

  logger.info(`Subscribed to price updates for: ${tokens.join(', ')}`, 'PriceFeed');
}

/**
 * Unsubscribe from price updates for a token
 */
export function unsubscribe(token: string): void {
  subscribers.delete(token);
  subscribedTokens.delete(token);

  // Stop polling if no subscriptions
  if (subscribedTokens.size === 0 && pollingInterval !== null) {
    stopPolling();
  }

  logger.info(`Unsubscribed from price updates for: ${token}`, 'PriceFeed');
}

/**
 * Start polling for price updates
 */
function startPolling(): void {
  if (pollingInterval !== null) return;

  // Initial fetch
  fetchAndNotifyPrices();

  // Poll every 10 seconds
  pollingInterval = setInterval(() => {
    fetchAndNotifyPrices();
  }, POLLING_INTERVAL);

  logger.info('Started price feed polling', 'PriceFeed');
}

/**
 * Stop polling for price updates
 */
function stopPolling(): void {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('Stopped price feed polling', 'PriceFeed');
  }
}

/**
 * Fetch prices and notify subscribers
 */
async function fetchAndNotifyPrices(): Promise<void> {
  const tokens = Array.from(subscribedTokens);
  if (tokens.length === 0) return;

  try {
    const prices = await getTokenPrices(tokens);

    // Notify all subscribers
    tokens.forEach((token) => {
      const price = prices[token];
      if (price !== undefined) {
        const update: PriceUpdate = {
          token,
          price,
          timestamp: Date.now(),
        };

        const tokenSubscribers = subscribers.get(token);
        if (tokenSubscribers) {
          tokenSubscribers.forEach((callback) => {
            try {
              callback(update);
            } catch (error) {
              logger.error(
                'Error in price update callback',
                error instanceof Error ? error : new Error(String(error)),
                'PriceFeed'
              );
            }
          });
        }
      }
    });
  } catch (error) {
    logger.error(
      'Error fetching prices for subscribers',
      error instanceof Error ? error : new Error(String(error)),
      'PriceFeed'
    );
  }
}

/**
 * Get prices for multiple tokens from CoinGecko API
 * Implements rate limiting and caching
 */
export async function getTokenPrices(tokens: string[]): Promise<Record<string, number>> {
  // Check cache first
  const cacheKey = tokens.sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Rate limiting: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  try {
    // Map tokens to CoinGecko IDs
    const tokenIds = tokens
      .map((token) => TOKEN_IDS[token])
      .filter((id): id is string => id !== undefined);

    if (tokenIds.length === 0) {
      return getFallbackPrices(tokens);
    }

    // Fetch from CoinGecko API
    const ids = tokenIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - return cached or fallback
        logger.warn('CoinGecko rate limited, using fallback', 'PriceFeed');
        return cached?.data || getFallbackPrices(tokens);
      }
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as PriceResponse;
    lastRequestTime = Date.now();

    // Map CoinGecko IDs back to token symbols
    const result: Record<string, number> = {};
    for (const token of tokens) {
      const tokenId = TOKEN_IDS[token];
      if (tokenId && data[tokenId]?.usd) {
        result[token] = data[tokenId].usd;
      } else {
        // Fallback for unmapped tokens
        result[token] = getFallbackPrices([token])[token] || 0;
      }
    }

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to fetch prices from CoinGecko',
      error instanceof Error ? error : new Error(String(error)),
      'PriceFeed'
    );
    // Return cached data or fallback
    return cached?.data || getFallbackPrices(tokens);
  }
}

/**
 * Get fallback prices (for when API is unavailable)
 */
function getFallbackPrices(tokens: string[]): Record<string, number> {
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
  for (const token of tokens) {
    result[token] = fallbackPrices[token] ?? 0;
  }

  return result;
}

/**
 * Clear cache (useful for testing)
 */
export function clearPriceCache(): void {
  cache.clear();
}

// Export singleton instance for WebSocket service
export const priceFeedService = {
  subscribe,
  unsubscribe,
  getTokenPrices,
  clearPriceCache,
};
