# Testing Guide

This guide explains how to test both the frontend and backend of the DeFi Builder application.

## Frontend Testing

### Quick Start

```bash
# Run all frontend tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run tests with UI (interactive test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Frontend tests are located in:
- `hooks/__tests__/` - Hook tests
- `services/__tests__/` - Service tests
- `services/backtest/__tests__/` - Backtest engine tests

### Example: Running Specific Tests

```bash
# Run only hook tests
npm test -- hooks

# Run only validator tests
npm test -- strategyValidator

# Run tests matching a pattern
npm test -- --grep "useDebounce"
```

### Coverage

After running `npm run test:coverage`, view the HTML report:
```bash
open coverage/index.html
```

## Backend Testing

### Setup

First, ensure backend dependencies are installed:

```bash
cd backend
npm install
```

### Quick Start

```bash
# From the backend directory
cd backend
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Creating Backend Tests

Backend tests should be placed in `backend/src/__tests__/` or alongside source files as `*.test.ts`.

Example test structure:
```typescript
// backend/src/__tests__/trpc.test.ts
import { describe, it, expect } from 'vitest';
import { appRouter } from '../trpc/router';

describe('tRPC Router', () => {
  it('should have health endpoint', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.health();
    expect(result.status).toBe('ok');
  });
});
```

## Running Both Frontend and Backend Tests

### Option 1: Run Sequentially

```bash
# Terminal 1: Frontend tests
npm test

# Terminal 2: Backend tests
cd backend && npm test
```

### Option 2: Use npm scripts (Recommended)

Add to root `package.json`:

```json
{
  "scripts": {
    "test:all": "npm test && cd backend && npm test",
    "test:frontend": "npm test",
    "test:backend": "cd backend && npm test"
  }
}
```

Then run:
```bash
npm run test:all
```

## Test Configuration

### Frontend (vitest.config.ts)
- Environment: `jsdom` (for React components)
- Setup file: `vitest.setup.ts`
- Coverage provider: `v8`

### Backend
- Uses Vitest (configured in `backend/package.json`)
- Should use Node.js environment (not jsdom)

## Writing Tests

### Frontend Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Backend API Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from '../trpc/router';
import { createContext } from '../trpc/context';

describe('Auth endpoints', () => {
  it('should login with valid wallet address', async () => {
    const ctx = createContext({ req: {} as any, res: {} as any });
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.auth.login({
      walletAddress: '0x1234567890123456789012345678901234567890'
    });
    
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
  });
});
```

## Debugging Tests

### Frontend
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest

# Run specific test file
npm test -- useDebounce.test.ts
```

### Backend
```bash
cd backend
# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest
```

## Continuous Integration

For CI/CD, use:

```bash
# Frontend
npm test -- --run --coverage

# Backend
cd backend && npm test -- --run --coverage
```

## Common Issues

### Frontend: "Cannot find module '@testing-library/dom'"
```bash
npm install --save-dev @testing-library/dom
```

### Backend: Missing dependencies
```bash
cd backend
npm install
```

### Type errors in tests
```bash
# Frontend
npm run type-check

# Backend
cd backend && npx tsc --noEmit
```

