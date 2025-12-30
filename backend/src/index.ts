import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import prisma from './db/client';
import { rateLimiters } from './middleware/rateLimiter';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';
import { logger } from './utils/logger';

dotenv.config();

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
