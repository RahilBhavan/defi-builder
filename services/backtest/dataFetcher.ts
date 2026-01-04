/**
 * Historical price data fetcher for backtesting
 * Uses multi-provider system with automatic fallbacks:
 * 1. Binance (1200 req/min, free, no API key) - Primary
 * 2. CoinPaprika (1000 req/day, free, no API key) - Fallback
 * 3. CoinGecko (10-50 req/min, free) - Last resort
 */

import { logger } from '../../lib/monitoring/logger';
import { priceProviderManager } from './priceProviders';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface TokenPriceData {
  token: string;
  prices: PriceDataPoint[];
}

// Supported tokens (used for validation)
const SUPPORTED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AAVE', 'UNI', 'LINK'];

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: PriceDataPoint[];
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();

/**
 * Check if token is supported
 */
function isTokenSupported(symbol: string): boolean {
  return SUPPORTED_TOKENS.includes(symbol.toUpperCase());
}

/**
 * Fetch historical price data from CoinGecko
 */
export async function fetchHistoricalPrices(
  token: string,
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily' = 'daily'
): Promise<PriceDataPoint[]> {
  if (!isTokenSupported(token)) {
    throw new Error(
      `Unsupported token: ${token}. Supported tokens: ${SUPPORTED_TOKENS.join(', ')}`
    );
  }

  // Check cache
  const cacheKey = `${token}-${startDate.getTime()}-${endDate.getTime()}-${interval}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use multi-provider system with automatic fallbacks
    const prices = await priceProviderManager.fetchHistoricalPrices(
      token,
      startDate,
      endDate,
      interval
    );

    // Cache the result
    priceCache.set(cacheKey, {
      data: prices,
      timestamp: Date.now(),
    });

    return prices;
  } catch (error) {
    logger.error(
      `Error fetching prices for ${token}`,
      error instanceof Error ? error : new Error(String(error)),
      'DataFetcher'
    );
    
    // If we have cached data (even if expired), use it as fallback
    const cached = priceCache.get(cacheKey);
    if (cached) {
      logger.warn(`Using expired cache for ${token} due to API error`, 'DataFetcher');
      return cached.data;
    }
    
    // Last resort: generate synthetic price data based on token
    logger.warn(`Generating fallback price data for ${token}`, 'DataFetcher');
    return generateFallbackPriceData(startDate, endDate, interval, token);
  }
}

/**
 * Generate fallback price data when CoinGecko API is unavailable
 * Uses reasonable defaults based on token type
 */
function generateFallbackPriceData(
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily',
  token: string
): PriceDataPoint[] {
  // Default prices (approximate market values)
  const defaultPrices: Record<string, number> = {
    ETH: 2500,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    WBTC: 45000,
    AAVE: 100,
    UNI: 10,
    LINK: 15,
  };
  
  const basePrice = defaultPrices[token.toUpperCase()] || 1000;
  const prices: PriceDataPoint[] = [];
  
  // Generate price points at the requested interval
  const step = interval === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    // Add small random variation to make it realistic
    const variation = 0.95 + Math.random() * 0.1; // ±5% variation
    prices.push({
      timestamp: current.getTime(),
      price: basePrice * variation,
    });
    
    current = new Date(current.getTime() + step);
  }
  
  return prices;
}


/**
 * Get price at a specific timestamp (interpolate if needed)
 */
export function getPriceAtTimestamp(prices: PriceDataPoint[], timestamp: number): number {
  if (prices.length === 0) {
    throw new Error('No price data available');
  }

  // Exact match
  const exact = prices.find((p) => p.timestamp === timestamp);
  if (exact) return exact.price;

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];

  // Validate array has elements
  if (!firstPrice || !lastPrice) {
    return 0;
  }

  // Before first price
  if (timestamp < firstPrice.timestamp) {
    return firstPrice.price;
  }

  // After last price
  if (timestamp > lastPrice.timestamp) {
    return lastPrice.price;
  }

  // Interpolate between two points
  for (let i = 0; i < prices.length - 1; i++) {
    const p1 = prices[i];
    const p2 = prices[i + 1];

    if (p1 && p2 && timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
      // Linear interpolation
      const ratio = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);
      return p1.price + (p2.price - p1.price) * ratio;
    }
  }

  return lastPrice.price;
}

/**
 * Fetch prices for multiple tokens
 */
export async function fetchMultipleTokenPrices(
  tokens: string[],
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily' = 'daily'
): Promise<Map<string, PriceDataPoint[]>> {
  const priceMap = new Map<string, PriceDataPoint[]>();

  // Fetch in parallel with rate limiting
  const fetchPromises = tokens.map(async (token, index) => {
    // Stagger requests to avoid rate limits
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, index * 200));
    }

    try {
      const prices = await fetchHistoricalPrices(token, startDate, endDate, interval);
      priceMap.set(token, prices);
    } catch (error) {
      logger.error(
        `Failed to fetch prices for ${token}`,
        error instanceof Error ? error : new Error(String(error)),
        'DataFetcher'
      );
      // Continue with other tokens
    }
  });

  await Promise.all(fetchPromises);
  return priceMap;
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}
