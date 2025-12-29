import redis from './redis';

const PRICE_TTL = 10; // 10 seconds

export class PriceCache {
  static async get(tokenSymbol: string): Promise<number | null> {
    const cached = await redis.get(`price:${tokenSymbol}`);
    return cached ? Number.parseFloat(cached) : null;
  }

  static async set(tokenSymbol: string, price: number): Promise<void> {
    await redis.setex(`price:${tokenSymbol}`, PRICE_TTL, price.toString());
  }

  static async getOrFetch(tokenSymbol: string, fetchFn: () => Promise<number>): Promise<number> {
    const cached = await this.get(tokenSymbol);
    if (cached !== null) return cached;

    const price = await fetchFn();
    await this.set(tokenSymbol, price);
    return price;
  }
}
