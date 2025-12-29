import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import prisma from './db/client';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test DB connection
app.get('/db-test', async (req, res) => {
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
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});
