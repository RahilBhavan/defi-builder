/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

import type { Request, Response } from 'express';

// Simple in-memory rate limiter (for production, use Redis-based solution)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 * @param getKey - Function to get unique key for rate limiting (default: IP address)
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
  getKey: (req: Request) => string = (req) => req.ip || req.socket.remoteAddress || 'unknown'
) {
  return (req: Request, res: Response, next: () => void) => {
    const key = getKey(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
      return;
    }

    // Increment count
    entry.count++;
    next();
  };
}

/**
 * Rate limiters for different endpoints
 */
export const rateLimiters = {
  // CoinGecko API proxy: 50 requests per minute (free tier limit)
  priceFeed: createRateLimiter(60 * 1000, 50),

  // Gemini AI: 60 requests per minute (typical limit)
  ai: createRateLimiter(60 * 1000, 60),

  // General API: 100 requests per minute
  general: createRateLimiter(60 * 1000, 100),

  // Auth endpoints: 5 requests per minute (prevent brute force)
  auth: createRateLimiter(60 * 1000, 5),
};

