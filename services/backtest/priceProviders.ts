/**
 * Multi-provider price API system with automatic fallbacks
 * Prioritizes providers with higher rate limits
 */

import { logger } from '../../lib/monitoring/logger';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface PriceProvider {
  name: string;
  fetchHistoricalPrices(
    token: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily'
  ): Promise<PriceDataPoint[]>;
}

// Token symbol mappings for different providers
const TOKEN_MAPPINGS: Record<string, Record<string, string>> = {
  binance: {
    ETH: 'ETHUSDT',
    USDC: 'USDCUSDT',
    USDT: 'USDTUSDT',
    DAI: 'DAIUSDT',
    WBTC: 'BTCUSDT', // Binance uses BTC, not WBTC
    AAVE: 'AAVEUSDT',
    UNI: 'UNIUSDT',
    LINK: 'LINKUSDT',
  },
  coingecko: {
    ETH: 'ethereum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    WBTC: 'wrapped-bitcoin',
    AAVE: 'aave',
    UNI: 'uniswap',
    LINK: 'chainlink',
  },
};

/**
 * Binance API Provider
 * Rate Limit: 1200 requests/minute (free, no API key)
 * Best for: High-frequency requests
 * Note: Uses proxy in dev mode to avoid CORS
 */
class BinanceProvider implements PriceProvider {
  name = 'Binance';
  private readonly API_BASE = import.meta.env.DEV
    ? '/api/binance'
    : 'https://api.binance.com/api/v3';
  private readonly FETCH_TIMEOUT_MS = 10000;

  async fetchHistoricalPrices(
    token: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily'
  ): Promise<PriceDataPoint[]> {
    const symbol = TOKEN_MAPPINGS.binance[token.toUpperCase()];
    if (!symbol) {
      throw new Error(`Binance: Unsupported token ${token}`);
    }

    // Binance uses kline intervals: 1h for hourly, 1d for daily
    const binanceInterval = interval === 'hourly' ? '1h' : '1d';

    // Binance requires timestamps in milliseconds
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const url = `${this.API_BASE}/klines?symbol=${symbol}&interval=${binanceInterval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Binance rate limit exceeded');
        }
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();

      // Binance klines format: [timestamp, open, high, low, close, volume, ...]
      const prices: PriceDataPoint[] = data.map((kline: number[]) => ({
        timestamp: kline[0], // Open time
        price: Number.parseFloat(kline[4] as unknown as string), // Close price
      }));

      return prices;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Binance API request timeout');
      }
      throw error;
    }
  }
}

// CoinPaprika removed - free tier doesn't include historical OHLCV data (returns 402)

/**
 * CoinGecko API Provider (Fallback)
 * Rate Limit: 10-50 calls/minute (free tier)
 * Best for: Last resort
 */
class CoinGeckoProvider implements PriceProvider {
  name = 'CoinGecko';
  private readonly API_BASE = import.meta.env.DEV
    ? '/api/coingecko'
    : 'https://api.coingecko.com/api/v3';
  private readonly FETCH_TIMEOUT_MS = 10000;

  async fetchHistoricalPrices(
    token: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily'
  ): Promise<PriceDataPoint[]> {
    const coinId = TOKEN_MAPPINGS.coingecko[token.toUpperCase()];
    if (!coinId) {
      throw new Error(`CoinGecko: Unsupported token ${token}`);
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = 90;

    if (days > maxDays) {
      // For longer periods, fetch in chunks
      return this.fetchChunked(coinId, startDate, endDate, interval);
    }

    const url = `${this.API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval === 'hourly' ? 'hourly' : 'daily'}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      // CoinGecko format: { prices: [[timestamp, price], ...] }
      const prices: PriceDataPoint[] = (data.prices || []).map(
        ([timestamp, price]: [number, number]) => ({
          timestamp,
          price,
        })
      );

      return prices;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CoinGecko API request timeout');
      }
      throw error;
    }
  }

  private async fetchChunked(
    coinId: string,
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

      const chunkPrices = await this.fetchHistoricalPrices(
        Object.keys(TOKEN_MAPPINGS.coingecko).find((k) => TOKEN_MAPPINGS.coingecko[k] === coinId) ||
          coinId,
        currentStart,
        currentEnd,
        interval
      );

      allPrices.push(...chunkPrices);
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);

      // Rate limiting: wait 1 second between chunks
      if (currentStart < endDate) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Remove duplicates and sort
    const uniquePrices = Array.from(new Map(allPrices.map((p) => [p.timestamp, p])).values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    return uniquePrices;
  }
}

/**
 * Multi-provider manager with automatic fallback
 */
class PriceProviderManager {
  private providers: PriceProvider[] = [
    new BinanceProvider(), // Primary: 1200 req/min (via proxy in dev)
    new CoinGeckoProvider(), // Fallback: 10-50 req/min
  ];

  async fetchHistoricalPrices(
    token: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily' = 'daily'
  ): Promise<PriceDataPoint[]> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        logger.debug(`Trying ${provider.name} for ${token}`, 'PriceProvider');
        const prices = await provider.fetchHistoricalPrices(token, startDate, endDate, interval);

        if (prices.length > 0) {
          logger.info(
            `Successfully fetched ${prices.length} price points from ${provider.name}`,
            'PriceProvider'
          );
          return prices;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`${provider.name} failed for ${token}: ${lastError.message}`, 'PriceProvider');
        // Continue to next provider
      }
    }

    // All providers failed - throw last error
    throw new Error(
      `All price providers failed for ${token}. Last error: ${lastError?.message || 'Unknown'}`
    );
  }
}

export const priceProviderManager = new PriceProviderManager();
