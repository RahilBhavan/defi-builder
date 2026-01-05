# DeFi Builder API Documentation

**Last Updated**: 2025-01-04

## Overview

DeFi Builder uses **tRPC** for type-safe API communication between frontend and backend. All API endpoints are fully typed and validated using Zod schemas.

### Key Features

- **Type Safety**: End-to-end type safety from backend to frontend
- **Automatic Validation**: Request/response validation with Zod
- **Developer Experience**: Auto-completion and type checking in IDE
- **Error Handling**: Structured error responses
- **Real-time Updates**: WebSocket support for live data

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: Configured via `VITE_API_URL` environment variable

## Authentication

All protected endpoints require authentication via JWT tokens stored in httpOnly cookies.

### Login

```typescript
// Frontend usage
const result = await trpc.auth.login.mutate({
  walletAddress: '0x...',
});
```

**Endpoint**: `POST /trpc/auth.login`

**Request**:
```typescript
{
  walletAddress: string; // Ethereum address (0x format)
}
```

**Response**:
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    walletAddress: string;
    createdAt: Date;
  };
}
```

### Logout

```typescript
await trpc.auth.logout.mutate();
```

**Endpoint**: `POST /trpc/auth.logout`

**Response**: `{ success: boolean }`

### Refresh Token

```typescript
const result = await trpc.auth.refresh.mutate();
```

**Endpoint**: `POST /trpc/auth.refresh`

**Response**: Same as login response

---

## Strategy Management

### Get All Strategies

```typescript
const strategies = await trpc.strategies.getAll.query();
```

**Endpoint**: `GET /trpc/strategies.getAll`

**Response**:
```typescript
Array<{
  id: string;
  name: string;
  blocks: LegoBlock[];
  createdAt: number;
  updatedAt: number;
  userId: string;
}>
```

### Get Strategy by ID

```typescript
const strategy = await trpc.strategies.getById.query({ id: 'strategy-id' });
```

**Endpoint**: `GET /trpc/strategies.getById`

**Request**:
```typescript
{
  id: string;
}
```

**Response**: Strategy object (same as above)

### Create Strategy

```typescript
const strategy = await trpc.strategies.create.mutate({
  name: 'My Strategy',
  blocks: [...],
});
```

**Endpoint**: `POST /trpc/strategies.create`

**Request**:
```typescript
{
  name: string;
  blocks: LegoBlock[];
}
```

**Response**: Created strategy object

### Update Strategy

```typescript
const strategy = await trpc.strategies.update.mutate({
  id: 'strategy-id',
  name: 'Updated Name',
  blocks: [...],
});
```

**Endpoint**: `POST /trpc/strategies.update`

**Request**:
```typescript
{
  id: string;
  name?: string;
  blocks?: LegoBlock[];
}
```

**Response**: Updated strategy object

### Delete Strategy

```typescript
await trpc.strategies.delete.mutate({ id: 'strategy-id' });
```

**Endpoint**: `POST /trpc/strategies.delete`

**Request**:
```typescript
{
  id: string;
}
```

**Response**: `{ success: boolean }`

---

## Backtest Management

### Get Backtest Results

```typescript
const results = await trpc.backtests.getByStrategyId.query({
  strategyId: 'strategy-id',
});
```

**Endpoint**: `GET /trpc/backtests.getByStrategyId`

**Request**:
```typescript
{
  strategyId: string;
}
```

**Response**:
```typescript
Array<{
  id: string;
  strategyId: string;
  metrics: {
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    // ... other metrics
  };
  equityCurve: Array<{ timestamp: Date; equity: number }>;
  trades: Trade[];
  createdAt: Date;
}>
```

### Create Backtest

```typescript
const result = await trpc.backtests.create.mutate({
  strategyId: 'strategy-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  initialCapital: 10000,
});
```

**Endpoint**: `POST /trpc/backtests.create`

**Request**:
```typescript
{
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
}
```

**Response**: Backtest result object

---

## AI Services

### Get AI Suggestions

```typescript
const suggestions = await trpc.ai.suggestions.query({
  currentBlocks: [...],
  userQuery: 'suggest next block',
});
```

**Endpoint**: `GET /trpc/ai.suggestions`

**Request**:
```typescript
{
  currentBlocks: LegoBlock[];
  userQuery?: string;
}
```

**Response**:
```typescript
Array<{
  type: 'block' | 'parameter' | 'strategy';
  suggestion: string;
  confidence: number;
  reasoning: string;
  blockIds?: string[];
}>
```

---

## Health Check

### Health Status

```typescript
const health = await trpc.health.query();
```

**Endpoint**: `GET /trpc/health`

**Response**:
```typescript
{
  status: 'ok' | 'degraded';
  timestamp: string;
  redis: 'connected' | 'disconnected';
}
```

---

## Error Handling

All API errors follow this structure:

```typescript
{
  error: {
    code: string;
    message: string;
    details?: unknown;
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

API endpoints are rate-limited:
- **General**: 100 requests per minute per IP
- **Auth**: 10 requests per minute per IP
- **AI**: 20 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## WebSocket Support (Future)

Real-time updates via WebSocket will be available for:
- Live backtest progress
- Strategy execution status
- Portfolio updates

---

## TypeScript Usage

All API types are automatically inferred from the tRPC router:

```typescript
import { trpc } from './lib/api/trpc';

// Fully typed!
const strategy = await trpc.strategies.getById.query({ id: '...' });
// strategy is fully typed as Strategy
```

---

## Examples

### Complete Strategy Workflow

```typescript
import { trpc } from './lib/api/trpc';

// 1. Create strategy
const strategy = await trpc.strategies.create.mutate({
  name: 'My DCA Strategy',
  blocks: [
    { type: 'price_trigger', ... },
    { type: 'uniswap_swap', ... },
  ],
});

// 2. Run backtest
const backtest = await trpc.backtests.create.mutate({
  strategyId: strategy.id,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  initialCapital: 10000,
});

// 3. Get results
const results = await trpc.backtests.getByStrategyId.query({
  strategyId: strategy.id,
});
```

---

## Additional Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Zod Validation](https://zod.dev/)
- [Backend Setup Guide](../backend/SETUP.md)

