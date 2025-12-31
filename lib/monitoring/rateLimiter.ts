/**
 * Client-side Rate Limiting Utility
 * Implements request queue with rate limiting and exponential backoff
 */

interface QueuedRequest {
  id: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  retries: number;
  timestamp: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxRetries?: number;
  retryDelay?: number;
}

class RateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestHistory: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(fn: () => Promise<T>, requestId?: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = requestId || `req-${Date.now()}-${Math.random()}`;
      this.queue.push({
        id,
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject: reject,
        retries: 0,
        timestamp: Date.now(),
      });

      this.processQueue();
    });
  }

  /**
   * Process queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Clean old request history
      const now = Date.now();
      this.requestHistory = this.requestHistory.filter(
        (timestamp) => now - timestamp < this.config.windowMs
      );

      // Check rate limit
      if (this.requestHistory.length >= this.config.maxRequests) {
        // Wait until we can make more requests
        const oldestRequest = this.requestHistory[0];
        const waitTime = this.config.windowMs - (now - oldestRequest);
        if (waitTime > 0) {
          await this.sleep(waitTime);
          continue;
        }
      }

      // Process next request
      const request = this.queue.shift();
      if (!request) break;

      try {
        // Execute request
        const result = await request.fn();
        this.requestHistory.push(Date.now());
        request.resolve(result);
      } catch (error) {
        // Check if error is rate limit (429)
        const isRateLimit =
          error instanceof Error &&
          (error.message.includes('429') ||
            error.message.includes('rate limit') ||
            error.message.includes('Too many requests'));

        if (isRateLimit && request.retries < (this.config.maxRetries || 3)) {
          // Exponential backoff for rate limit errors
          request.retries++;
          const delay = (this.config.retryDelay || 1000) * Math.pow(2, request.retries - 1);
          await this.sleep(delay);
          this.queue.unshift(request); // Add back to front of queue
        } else {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach((req) => {
      req.reject(new Error('Rate limiter cleared'));
    });
    this.queue = [];
    this.requestHistory = [];
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Create rate limiters for different services
export const priceFeedRateLimiter = new RateLimiter({
  maxRequests: 50, // CoinGecko free tier: 50 calls/minute
  windowMs: 60 * 1000, // 1 minute
});

export const aiRateLimiter = new RateLimiter({
  maxRequests: 60, // Gemini typical limit: 60 calls/minute
  windowMs: 60 * 1000,
});

export const generalRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
});

/**
 * Request deduplication helper
 * Prevents duplicate requests for the same resource
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>();

  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>,
    ttl = 5000 // 5 seconds default TTL
  ): Promise<T> {
    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Create new request
    const promise = fn().finally(() => {
      // Remove from pending after TTL
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, ttl);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

