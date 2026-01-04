import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL;

// Only create Redis client if REDIS_URL is explicitly set
// This makes Redis truly optional
let redis: Redis | null = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    // Don't retry on connection refused - fail silently
    enableOfflineQueue: false,
  });

  redis.on('connect', () => {
    logger.info('Redis connected', 'Redis');
  });

  redis.on('error', (err) => {
    // Only log errors if Redis was explicitly configured
    // This prevents spam when Redis is not available
    if (REDIS_URL) {
      logger.debug('Redis error (optional service)', err instanceof Error ? err : new Error(String(err)), 'Redis');
    }
  });
} else {
  logger.debug('Redis not configured, caching disabled', 'Redis');
}

// Export a wrapper that handles null redis gracefully
export const redisClient = redis;

// Default export for backward compatibility
export default redis;
