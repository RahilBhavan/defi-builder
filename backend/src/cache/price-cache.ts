import { redisClient } from './redis';

const PRICE_TTL = 10; // 10 seconds

export async function getPrice(tokenSymbol: string): Promise<number | null> {
  if (!redisClient) return null;
  const cached = await redisClient.get(`price:${tokenSymbol}`);
  return cached ? Number.parseFloat(cached) : null;
}

export async function setPrice(tokenSymbol: string, price: number): Promise<void> {
  if (!redisClient) return;
  await redisClient.setex(`price:${tokenSymbol}`, PRICE_TTL, price.toString());
}

export async function getOrFetchPrice(
  tokenSymbol: string,
  fetchFn: () => Promise<number>
): Promise<number> {
  const cached = await getPrice(tokenSymbol);
  if (cached !== null) return cached;

  const price = await fetchFn();
  await setPrice(tokenSymbol, price);
  return price;
}
