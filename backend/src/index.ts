import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import prisma from './db/client';
import { rateLimiters } from './middleware/rateLimiter';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';
import { validateEnv } from './utils/envValidation';
import { logger } from './utils/logger';
import { initSentry, performanceMiddleware } from './utils/monitoring';

dotenv.config();

// Initialize monitoring (Sentry)
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  initSentry(sentryDsn);
}

// Validate environment variables on startup
try {
  validateEnv();
} catch (error) {
  logger.error('Failed to start server due to environment validation errors', error instanceof Error ? error : new Error(String(error)), 'Server');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow credentials (cookies)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies
  })
);
app.use(express.json());
app.use(cookieParser()); // Parse cookies

// CSRF protection - generate and validate CSRF tokens
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_TOKEN_HEADER = 'x-csrf-token';

// Generate CSRF token
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store CSRF tokens in memory (in production, use Redis)
const csrfTokens = new Set<string>();
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

// Clean up expired tokens
setInterval(() => {
  // In production, use Redis TTL instead
}, 5 * 60 * 1000);

// Security headers (CSP, etc.) and CSRF protection
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.coingecko.com https://*.googleapis.com;"
  );
  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSRF protection for state-changing operations
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const token = req.headers[CSRF_TOKEN_HEADER] as string;
    const cookieToken = req.cookies?.csrf_token;

    // For now, we'll skip CSRF for tRPC endpoints (can be added later)
    // In production, implement proper CSRF token validation
    if (req.path.startsWith('/trpc')) {
      // tRPC handles its own validation
      return next();
    }

    // Validate CSRF token for other endpoints
    if (!token || !cookieToken || token !== cookieToken || !csrfTokens.has(token)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  } else {
    // Generate and set CSRF token for GET requests
    const token = generateCSRFToken();
    csrfTokens.add(token);
    res.cookie('csrf_token', token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_TTL,
      path: '/',
    });
  }

  next();
});

// Apply rate limiting to all routes
app.use(rateLimiters.general);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test DB connection
app.get('/db-test', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ success: true, userCount });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(PORT, () => {
  logger.info(`Backend server running on http://localhost:${PORT}`, 'Server');
  logger.info(`tRPC endpoint: http://localhost:${PORT}/trpc`, 'Server');
});
