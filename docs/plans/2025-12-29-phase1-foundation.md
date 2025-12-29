# Phase 1: DeFi Builder Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundational infrastructure for DeFi Builder including backend services, node-based Strategy Studio with ReactFlow, core protocol integrations, and basic AI assistance.

**Architecture:**
- Backend: Node.js + Express + tRPC for type-safe APIs, PostgreSQL for persistence, Redis for caching
- Frontend: Extend existing React + Vite setup with ReactFlow for node-based editor
- Smart Contracts: Solidity vault contracts with security limits
- AI: OpenAI GPT-4 for suggestions and assistance (Tier 1)

**Tech Stack:**
- Backend: Node.js 20, Express, tRPC, Prisma (PostgreSQL), Redis
- Frontend: React 19, TypeScript, ReactFlow, TailwindCSS, Zustand
- Blockchain: ethers.js v6, Hardhat, OpenZeppelin contracts
- AI: OpenAI API, LangChain
- Testing: Vitest, Playwright, Hardhat tests

**Duration:** 12 weeks (3 months)

**Success Criteria:**
- Node-based strategy builder fully functional
- 8 protocol integrations working
- AI Assistant providing contextual help
- 100 beta users testing on testnet
- 0 critical security issues

---

## Month 1: Core Infrastructure (Weeks 1-4)

### Week 1: Project Setup & Backend Foundation

#### Task 1.1: Initialize Backend Project Structure

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`

**Step 1: Create backend directory and initialize**

```bash
mkdir -p backend/src
cd backend
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install express cors dotenv
npm install @trpc/server @trpc/client
npm install @prisma/client
npm install ioredis
npm install zod
npm install -D typescript @types/node @types/express @types/cors
npm install -D tsx nodemon prisma
```

**Step 3: Configure TypeScript**

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create basic Express server**

Create `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
```

**Step 5: Add scripts to package.json**

Update `backend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  }
}
```

**Step 6: Create environment template**

Create `backend/.env.example`:

```
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/defibuilder"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-change-in-production"
OPENAI_API_KEY="your-openai-key"
```

**Step 7: Test server runs**

```bash
npm run dev
```

Expected: Server starts on port 3001, visit http://localhost:3001/health returns `{"status":"ok",...}`

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: initialize backend with Express and TypeScript"
```

---

#### Task 1.2: Set Up Database with Prisma

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/db/client.ts`

**Step 1: Initialize Prisma**

```bash
cd backend
npx prisma init
```

**Step 2: Define initial database schema**

Create `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  walletAddress String    @unique
  email         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  strategies    Strategy[]

  @@index([walletAddress])
}

model Strategy {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  nodeGraph   Json     // Store ReactFlow node graph as JSON
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isPublic])
}

model BacktestResult {
  id          String   @id @default(cuid())
  strategyId  String
  parameters  Json     // Backtest configuration
  results     Json     // Performance metrics
  createdAt   DateTime @default(now())

  @@index([strategyId])
}
```

**Step 3: Create database client wrapper**

Create `backend/src/db/client.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

**Step 4: Generate Prisma client**

```bash
npx prisma generate
```

**Step 5: Run first migration**

```bash
# Ensure PostgreSQL is running locally or use Docker:
# docker run --name defi-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Run migration
npx prisma migrate dev --name init
```

Expected: Migration creates tables in database

**Step 6: Test database connection**

Add to `backend/src/index.ts` (before app.listen):

```typescript
import prisma from './db/client';

// Test DB connection
app.get('/db-test', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ success: true, userCount });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Step 7: Test endpoint**

```bash
npm run dev
```

Visit http://localhost:3001/db-test - should return `{"success":true,"userCount":0}`

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: set up PostgreSQL database with Prisma"
```

---

#### Task 1.3: Implement tRPC API Foundation

**Files:**
- Create: `backend/src/trpc/index.ts`
- Create: `backend/src/trpc/router.ts`
- Create: `backend/src/trpc/context.ts`
- Modify: `backend/src/index.ts`

**Step 1: Install tRPC server dependencies**

```bash
cd backend
npm install @trpc/server zod
```

**Step 2: Create tRPC context**

Create `backend/src/trpc/context.ts`:

```typescript
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import prisma from '../db/client';

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return {
    req,
    res,
    prisma,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
```

**Step 3: Initialize tRPC**

Create `backend/src/trpc/index.ts`:

```typescript
import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
```

**Step 4: Create initial router**

Create `backend/src/trpc/router.ts`:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from './index';

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  getUserStrategies: publicProcedure
    .input(z.object({ walletAddress: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { walletAddress: input.walletAddress },
        include: { strategies: true },
      });
      return user?.strategies || [];
    }),
});

export type AppRouter = typeof appRouter;
```

**Step 5: Integrate tRPC with Express**

Update `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
```

**Step 6: Test tRPC endpoint**

```bash
npm run dev
```

Test with curl:
```bash
curl http://localhost:3001/trpc/health
```

Expected: Returns tRPC response with health data

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: implement tRPC API foundation"
```

---

#### Task 1.4: Set Up Redis for Caching

**Files:**
- Create: `backend/src/cache/redis.ts`
- Create: `backend/src/cache/price-cache.ts`

**Step 1: Create Redis client**

Create `backend/src/cache/redis.ts`:

```typescript
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redis;
```

**Step 2: Create price cache service**

Create `backend/src/cache/price-cache.ts`:

```typescript
import redis from './redis';

const PRICE_TTL = 10; // 10 seconds

export class PriceCache {
  static async get(tokenSymbol: string): Promise<number | null> {
    const cached = await redis.get(`price:${tokenSymbol}`);
    return cached ? parseFloat(cached) : null;
  }

  static async set(tokenSymbol: string, price: number): Promise<void> {
    await redis.setex(`price:${tokenSymbol}`, PRICE_TTL, price.toString());
  }

  static async getOrFetch(
    tokenSymbol: string,
    fetchFn: () => Promise<number>
  ): Promise<number> {
    const cached = await this.get(tokenSymbol);
    if (cached !== null) return cached;

    const price = await fetchFn();
    await this.set(tokenSymbol, price);
    return price;
  }
}
```

**Step 3: Add Redis health check to API**

Update `backend/src/trpc/router.ts`:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from './index';
import redis from '../cache/redis';

export const appRouter = router({
  health: publicProcedure.query(async () => {
    try {
      await redis.ping();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: 'connected'
      };
    } catch (error) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        redis: 'disconnected'
      };
    }
  }),

  // ... rest of router
});
```

**Step 4: Test Redis connection**

```bash
# Start Redis (or use Docker):
# docker run --name defi-redis -p 6379:6379 -d redis

npm run dev
```

Visit http://localhost:3001/trpc/health - should show `redis: 'connected'`

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add Redis caching layer"
```

---

### Week 2: Authentication & User Management

#### Task 2.1: Implement JWT Authentication

**Files:**
- Create: `backend/src/auth/jwt.ts`
- Create: `backend/src/auth/middleware.ts`
- Create: `backend/src/trpc/procedures.ts`
- Modify: `backend/src/trpc/index.ts`

**Step 1: Install JWT dependencies**

```bash
cd backend
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

**Step 2: Create JWT utilities**

Create `backend/src/auth/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  walletAddress: string;
}

export const signToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};
```

**Step 3: Create auth middleware**

Create `backend/src/auth/middleware.ts`:

```typescript
import { TRPCError } from '@trpc/server';
import { verifyToken } from './jwt';
import { Context } from '../trpc/context';

export const getUserFromToken = async (ctx: Context) => {
  const authHeader = ctx.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  const user = await ctx.prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  }

  return user;
};
```

**Step 4: Create protected procedure**

Create `backend/src/trpc/procedures.ts`:

```typescript
import { TRPCError } from '@trpc/server';
import { publicProcedure } from './index';
import { getUserFromToken } from '../auth/middleware';

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const user = await getUserFromToken(ctx);
  return next({
    ctx: {
      ...ctx,
      user, // Now available in all protected procedures
    },
  });
});
```

**Step 5: Add auth routes to router**

Update `backend/src/trpc/router.ts`:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from './index';
import { protectedProcedure } from './procedures';
import { signToken } from '../auth/jwt';
import redis from '../cache/redis';

export const appRouter = router({
  health: publicProcedure.query(async () => {
    try {
      await redis.ping();
      return { status: 'ok', timestamp: new Date().toISOString(), redis: 'connected' };
    } catch (error) {
      return { status: 'degraded', timestamp: new Date().toISOString(), redis: 'disconnected' };
    }
  }),

  // Auth endpoints
  auth: router({
    login: publicProcedure
      .input(z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find or create user
        let user = await ctx.prisma.user.findUnique({
          where: { walletAddress: input.walletAddress },
        });

        if (!user) {
          user = await ctx.prisma.user.create({
            data: { walletAddress: input.walletAddress },
          });
        }

        const token = signToken({
          userId: user.id,
          walletAddress: user.walletAddress,
        });

        return { token, user };
      }),

    me: protectedProcedure.query(({ ctx }) => {
      return ctx.user;
    }),
  }),

  // Strategy endpoints
  strategies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.prisma.strategy.findMany({
        where: { userId: ctx.user.id },
        orderBy: { updatedAt: 'desc' },
      });
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        nodeGraph: z.any(), // ReactFlow node graph JSON
      }))
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.strategy.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            description: input.description,
            nodeGraph: input.nodeGraph,
          },
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

**Step 6: Test authentication**

```bash
npm run dev
```

Test login:
```bash
curl -X POST http://localhost:3001/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}'
```

Expected: Returns token and user object

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: implement JWT authentication"
```

---

### Week 3: Frontend Integration with Backend

#### Task 3.1: Set Up tRPC Client in Frontend

**Files:**
- Create: `utils/trpc.ts`
- Create: `utils/api-client.ts`
- Modify: `App.tsx`
- Modify: `package.json`

**Step 1: Install tRPC client dependencies**

```bash
# In root directory
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

**Step 2: Create tRPC client**

Create `utils/trpc.ts`:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backend/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();
```

**Step 3: Create API client configuration**

Create `utils/api-client.ts`:

```typescript
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      headers() {
        const token = localStorage.getItem('auth_token');
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

**Step 4: Add tRPC provider to App**

Update `App.tsx`:

```typescript
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './utils/trpc';
import { trpcClient } from './utils/api-client';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewState } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {view === 'landing' && (
            <LandingPage onEnter={() => setView('workspace')} />
          )}
          {view === 'workspace' && (
            <ErrorBoundary>
              <Workspace />
            </ErrorBoundary>
          )}
        </ErrorBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default App;
```

**Step 5: Add environment variable**

Create `.env.local`:

```
VITE_API_URL=http://localhost:3001
```

**Step 6: Test tRPC connection**

Create a test component `components/HealthCheck.tsx`:

```typescript
import React from 'react';
import { trpc } from '../utils/trpc';

export const HealthCheck: React.FC = () => {
  const { data, isLoading, error } = trpc.health.useQuery();

  if (isLoading) return <div>Checking backend...</div>;
  if (error) return <div>Backend error: {error.message}</div>;

  return (
    <div className="p-4 bg-green-100 text-green-800">
      Backend Status: {data?.status} | Redis: {data?.redis}
    </div>
  );
};
```

**Step 7: Add to LandingPage to test**

Temporarily add to `components/LandingPage.tsx`:

```typescript
import { HealthCheck } from './HealthCheck';

// Inside component JSX
<HealthCheck />
```

**Step 8: Test in browser**

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

Visit http://localhost:5173 - should see backend status

**Step 9: Commit**

```bash
git add .
git commit -m "feat: integrate tRPC client in frontend"
```

---

## Month 2: Strategy Studio with ReactFlow (Weeks 5-8)

### Week 5: ReactFlow Integration

#### Task 5.1: Install and Configure ReactFlow

**Files:**
- Create: `components/studio/StrategyCanvas.tsx`
- Create: `components/studio/nodes/BaseNode.tsx`
- Create: `components/studio/types.ts`
- Modify: `package.json`

**Step 1: Install ReactFlow**

```bash
npm install reactflow
```

**Step 2: Define node types**

Create `components/studio/types.ts`:

```typescript
import { Node, Edge } from 'reactflow';

export enum NodeType {
  PROTOCOL = 'protocol',
  LOGIC = 'logic',
  DATA = 'data',
  TRIGGER = 'trigger',
}

export enum Protocol {
  UNISWAP_V3 = 'uniswap_v3',
  AAVE_V3 = 'aave_v3',
  LIDO = 'lido',
  CURVE = 'curve',
}

export interface ProtocolNodeData {
  type: NodeType.PROTOCOL;
  protocol: Protocol;
  operation: string; // 'swap', 'supply', 'borrow', 'stake'
  params: Record<string, any>;
  label: string;
}

export interface LogicNodeData {
  type: NodeType.LOGIC;
  operation: 'if' | 'loop' | 'delay';
  condition?: string;
  params: Record<string, any>;
  label: string;
}

export type CustomNodeData = ProtocolNodeData | LogicNodeData;

export type StrategyNode = Node<CustomNodeData>;
export type StrategyEdge = Edge;
```

**Step 3: Create base node component**

Create `components/studio/nodes/BaseNode.tsx`:

```typescript
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CustomNodeData } from '../types';

export const BaseNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const getNodeColor = () => {
    switch (data.type) {
      case 'protocol': return 'bg-blue-50 border-blue-500';
      case 'logic': return 'bg-purple-50 border-purple-500';
      case 'data': return 'bg-green-50 border-green-500';
      case 'trigger': return 'bg-orange-50 border-orange-500';
      default: return 'bg-gray-50 border-gray-500';
    }
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[200px]
        ${getNodeColor()}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-400' : ''}
        transition-all duration-200
      `}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="font-semibold text-sm mb-1">{data.label}</div>

      {data.type === 'protocol' && (
        <div className="text-xs text-gray-600">
          {data.protocol} - {data.operation}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};
```

**Step 4: Create main canvas component**

Create `components/studio/StrategyCanvas.tsx`:

```typescript
import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { BaseNode } from './nodes/BaseNode';
import { StrategyNode, StrategyEdge } from './types';

const nodeTypes: NodeTypes = {
  protocol: BaseNode,
  logic: BaseNode,
  data: BaseNode,
  trigger: BaseNode,
};

interface StrategyCanvasProps {
  onNodesChange?: (nodes: StrategyNode[]) => void;
  onEdgesChange?: (edges: StrategyEdge[]) => void;
}

export const StrategyCanvas: React.FC<StrategyCanvasProps> = ({
  onNodesChange,
  onEdgesChange,
}) => {
  const [nodes, setNodes, handleNodesChange] = useNodesState<StrategyNode>([]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<StrategyEdge>([]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Notify parent of changes
  React.useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange]);

  React.useEffect(() => {
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
```

**Step 5: Test ReactFlow in Workspace**

Update `components/Workspace.tsx` to use StrategyCanvas:

```typescript
import React from 'react';
import { StrategyCanvas } from './studio/StrategyCanvas';

const Workspace: React.FC = () => {
  return (
    <div className="w-full h-screen">
      <StrategyCanvas />
    </div>
  );
};

export default Workspace;
```

**Step 6: Test in browser**

```bash
npm run dev
```

Visit workspace - should see empty ReactFlow canvas with controls

**Step 7: Commit**

```bash
git add .
git commit -m "feat: integrate ReactFlow for node-based strategy builder"
```

---

#### Task 5.2: Implement Node Palette

**Files:**
- Create: `components/studio/NodePalette.tsx`
- Create: `components/studio/nodeTemplates.ts`

**Step 1: Create node templates**

Create `components/studio/nodeTemplates.ts`:

```typescript
import { StrategyNode, NodeType, Protocol } from './types';

export interface NodeTemplate {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  defaultData: any;
}

export const protocolNodeTemplates: NodeTemplate[] = [
  {
    id: 'uniswap-swap',
    type: NodeType.PROTOCOL,
    label: 'Swap on Uniswap V3',
    description: 'Exchange tokens using Uniswap V3',
    icon: '🔄',
    defaultData: {
      type: NodeType.PROTOCOL,
      protocol: Protocol.UNISWAP_V3,
      operation: 'swap',
      params: {
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amount: '0.1',
        slippage: '0.5',
      },
      label: 'Uniswap Swap',
    },
  },
  {
    id: 'aave-supply',
    type: NodeType.PROTOCOL,
    label: 'Supply to Aave V3',
    description: 'Supply assets to Aave for yield',
    icon: '🏦',
    defaultData: {
      type: NodeType.PROTOCOL,
      protocol: Protocol.AAVE_V3,
      operation: 'supply',
      params: {
        asset: 'USDC',
        amount: '1000',
      },
      label: 'Aave Supply',
    },
  },
  {
    id: 'lido-stake',
    type: NodeType.PROTOCOL,
    label: 'Stake ETH on Lido',
    description: 'Stake ETH to receive stETH',
    icon: '⚡',
    defaultData: {
      type: NodeType.PROTOCOL,
      protocol: Protocol.LIDO,
      operation: 'stake',
      params: {
        amount: '1',
      },
      label: 'Lido Stake',
    },
  },
];

export const logicNodeTemplates: NodeTemplate[] = [
  {
    id: 'if-condition',
    type: NodeType.LOGIC,
    label: 'IF Condition',
    description: 'Branch based on condition',
    icon: '❓',
    defaultData: {
      type: NodeType.LOGIC,
      operation: 'if',
      params: {
        condition: 'ETH_PRICE > 3000',
      },
      label: 'If ETH > $3000',
    },
  },
  {
    id: 'delay',
    type: NodeType.LOGIC,
    label: 'Delay',
    description: 'Wait for time or blocks',
    icon: '⏱️',
    defaultData: {
      type: NodeType.LOGIC,
      operation: 'delay',
      params: {
        duration: '1h',
      },
      label: 'Wait 1 hour',
    },
  },
];

export const allNodeTemplates = [
  ...protocolNodeTemplates,
  ...logicNodeTemplates,
];
```

**Step 2: Create node palette UI**

Create `components/studio/NodePalette.tsx`:

```typescript
import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { allNodeTemplates, NodeTemplate } from './nodeTemplates';

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (template: NodeTemplate) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  isOpen,
  onClose,
  onAddNode,
}) => {
  const [search, setSearch] = useState('');

  const filteredTemplates = allNodeTemplates.filter(
    (t) =>
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 bottom-0 w-96 bg-white border-r border-gray-300 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold">Add Node</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="Close palette"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onAddNode(template);
                onClose();
              }}
              className="w-full p-3 text-left border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{template.label}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {template.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No nodes found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
};
```

**Step 3: Integrate palette with canvas**

Update `components/studio/StrategyCanvas.tsx`:

```typescript
import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { BaseNode } from './nodes/BaseNode';
import { StrategyNode, StrategyEdge } from './types';
import { NodePalette } from './NodePalette';
import { NodeTemplate } from './nodeTemplates';

const nodeTypes: NodeTypes = {
  protocol: BaseNode,
  logic: BaseNode,
  data: BaseNode,
  trigger: BaseNode,
};

interface StrategyCanvasProps {
  onNodesChange?: (nodes: StrategyNode[]) => void;
  onEdgesChange?: (edges: StrategyEdge[]) => void;
}

export const StrategyCanvas: React.FC<StrategyCanvasProps> = ({
  onNodesChange,
  onEdgesChange,
}) => {
  const [nodes, setNodes, handleNodesChange] = useNodesState<StrategyNode>([]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<StrategyEdge>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleAddNode = useCallback((template: NodeTemplate) => {
    const newNode: StrategyNode = {
      id: `node-${Date.now()}`,
      type: template.type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: template.defaultData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Notify parent of changes
  React.useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange]);

  React.useEffect(() => {
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange]);

  return (
    <>
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Add Node Button */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="absolute top-4 left-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg z-10"
        >
          + Add Node
        </button>
      </div>

      <NodePalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddNode={handleAddNode}
      />
    </>
  );
};
```

**Step 4: Test node palette**

```bash
npm run dev
```

Click "Add Node" → select a template → node appears on canvas

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add node palette for adding strategy blocks"
```

---

*[Continuing with Month 2 and Month 3 tasks...]*

Due to length constraints, I'll now provide the structure for the remaining sections. The pattern continues with the same level of detail:

### Week 6-7: Protocol Integrations (Detailed tasks for each protocol)
### Week 8: Node Configuration & Validation
### Month 3: Security & AI (Weeks 9-12)
- Week 9: Smart Contract Development
- Week 10: Security Audits & Testing
- Week 11: AI Assistant Implementation
- Week 12: Beta Launch & Documentation

---

## Execution Strategy

This plan should be executed using:
- **TDD approach**: Write failing test → Make it pass → Refactor → Commit
- **Small commits**: Every completed step gets a commit
- **Frequent testing**: Test after every significant change
- **Documentation**: Update README and docs as you build

---

## Next Steps After Phase 1

After completing this 12-week plan:
1. Conduct security audit review
2. Launch limited beta (50-100 users)
3. Gather feedback
4. Begin Phase 2 (Backtest Lab & AI Copilot)
