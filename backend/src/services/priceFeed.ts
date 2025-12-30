/**
 * Price Feed Service (Backend)
 * Proxy service for CoinGecko API to keep API keys server-side
 * Implements rate limiting and caching
 */

interface PriceResponse {
  [tokenId: string]: {
    usd: number;
  };
}

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
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
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
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - return cached or fallback
        console.warn('CoinGecko rate limited, using fallback');
        return cached?.data || getFallbackPrices(tokens);
      }
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as PriceResponse;
    lastRequestTime = Date.now();

    // Map CoinGecko IDs back to token symbols
    const result: Record<string, number> = {};
    tokens.forEach((token) => {
      const tokenId = TOKEN_IDS[token];
      if (tokenId && data[tokenId]?.usd) {
        result[token] = data[tokenId].usd;
      } else {
        // Fallback for unmapped tokens
        result[token] = getFallbackPrices([token])[token] || 0;
      }
    });

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error('Failed to fetch prices from CoinGecko:', error);
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
  tokens.forEach((token) => {
    result[token] = fallbackPrices[token] ?? 0;
  });

  return result;
}

/**
 * Clear cache (useful for testing)
 */
export function clearPriceCache(): void {
  cache.clear();
}

