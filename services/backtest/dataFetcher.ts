/**
 * Historical price data fetcher for backtesting
 * Uses CoinGecko API (free, no API key required)
 */

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface TokenPriceData {
  token: string;
  prices: PriceDataPoint[];
}

// CoinGecko token ID mapping
const TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
  AAVE: 'aave',
  UNI: 'uniswap',
  LINK: 'chainlink',
};

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: PriceDataPoint[];
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();

/**
 * Get CoinGecko token ID from symbol
 */
function getTokenId(symbol: string): string | null {
  return TOKEN_IDS[symbol.toUpperCase()] || null;
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
  const tokenId = getTokenId(token);
  if (!tokenId) {
    throw new Error(`Unsupported token: ${token}. Supported tokens: ${Object.keys(TOKEN_IDS).join(', ')}`);
  }

  // Check cache
  const cacheKey = `${tokenId}-${startDate.getTime()}-${endDate.getTime()}-${interval}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Calculate days between dates
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // CoinGecko free tier limit: max 90 days for historical data
    const maxDays = 90;
    if (days > maxDays) {
      // For longer periods, fetch in chunks
      return await fetchHistoricalPricesChunked(tokenId, startDate, endDate, interval);
    }

    const url = `${COINGECKO_API}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=${interval === 'hourly' ? 'hourly' : 'daily'}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchHistoricalPrices(token, startDate, endDate, interval);
      }
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract prices from response
    const prices: PriceDataPoint[] = (data.prices || []).map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));

    // Cache the result
    priceCache.set(cacheKey, {
      data: prices,
      timestamp: Date.now(),
    });

    return prices;
  } catch (error) {
    console.error(`Error fetching prices for ${token}:`, error);
    throw error;
  }
}

/**
 * Fetch historical prices in chunks for periods > 90 days
 */
async function fetchHistoricalPricesChunked(
  tokenId: string,
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily'
): Promise<PriceDataPoint[]> {
  const allPrices: PriceDataPoint[] = [];
  let currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 89); // 90 days max
    
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime());
    }

    const chunkPrices = await fetchHistoricalPrices(
      Object.keys(TOKEN_IDS).find(k => TOKEN_IDS[k] === tokenId) || tokenId,
      currentStart,
      currentEnd,
      interval
    );

    allPrices.push(...chunkPrices);
    
    // Move to next chunk
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
    
    // Rate limiting: wait 1 second between chunks
    if (currentStart < endDate) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Remove duplicates and sort by timestamp
  const uniquePrices = Array.from(
    new Map(allPrices.map(p => [p.timestamp, p])).values()
  ).sort((a, b) => a.timestamp - b.timestamp);

  return uniquePrices;
}

/**
 * Get price at a specific timestamp (interpolate if needed)
 */
export function getPriceAtTimestamp(
  prices: PriceDataPoint[],
  timestamp: number
): number {
  if (prices.length === 0) {
    throw new Error('No price data available');
  }

  // Exact match
  const exact = prices.find(p => p.timestamp === timestamp);
  if (exact) return exact.price;

  // Before first price
  if (timestamp < prices[0].timestamp) {
    return prices[0].price;
  }

  // After last price
  if (timestamp > prices[prices.length - 1].timestamp) {
    return prices[prices.length - 1].price;
  }

  // Interpolate between two points
  for (let i = 0; i < prices.length - 1; i++) {
    const p1 = prices[i];
    const p2 = prices[i + 1];
    
    if (timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
      // Linear interpolation
      const ratio = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);
      return p1.price + (p2.price - p1.price) * ratio;
    }
  }

  return prices[prices.length - 1].price;
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
      await new Promise(resolve => setTimeout(resolve, index * 200));
    }
    
    try {
      const prices = await fetchHistoricalPrices(token, startDate, endDate, interval);
      priceMap.set(token, prices);
    } catch (error) {
      console.error(`Failed to fetch prices for ${token}:`, error);
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

