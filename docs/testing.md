# Testing Guide

## Overview

This project uses a comprehensive testing strategy with unit tests, integration tests, and E2E tests.

## Test Structure

```
├── __tests__/              # Unit and integration tests
│   ├── integration/        # Integration tests
│   └── utils/              # Test utilities
├── e2e/                    # E2E tests (Playwright)
│   ├── flows/              # Test flows
│   ├── fixtures/           # Test fixtures
│   └── utils/               # E2E utilities
└── vitest.setup.ts         # Test setup file
```

## Unit Tests

Unit tests are located alongside the code they test, using the pattern `*.test.ts` or `*.spec.ts`.

### Running Unit Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test:coverage

# Run specific test file
bun test path/to/test.test.ts
```

### Writing Unit Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

## Integration Tests

Integration tests are located in `__tests__/integration/` and test the interaction between multiple components.

### Writing Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('Integration Test', () => {
  it('should integrate components', () => {
    // Test component interactions
  });
});
```

## E2E Tests

E2E tests use Playwright and are located in `e2e/`.

### Running E2E Tests

```bash
# Run all E2E tests
bunx playwright test

# Run specific test file
bunx playwright test e2e/flows/strategy-creation.spec.ts

# Run tests in UI mode
bunx playwright test --ui

# Run tests in headed mode
bunx playwright test --headed
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';
import { mockLogin } from '../fixtures/auth';

test.describe('Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/');
  });

  test('should complete user flow', async ({ page }) => {
    // Test user interactions
  });
});
```

## Test Utilities

### Shared Test Helpers

Located in `__tests__/utils/test-helpers.ts`:

- `createWebSocketClientMock()` - Create WebSocket client mock
- `createTrpcMock()` - Create tRPC mock
- `createQueryClientWrapper()` - React Query wrapper for tests
- `waitForCondition()` - Wait for condition with timeout

### E2E Fixtures

Located in `e2e/fixtures/`:

- `auth.ts` - Authentication helpers
- `strategy.ts` - Strategy creation helpers
- `websocket.ts` - WebSocket helpers

### E2E Utilities

Located in `e2e/utils/`:

- `helpers.ts` - Common E2E utilities
- `constants.ts` - Test constants

## Mocking Guidelines

### WebSocket Mocking

Use the shared WebSocket client mock factory:

```typescript
import { createWebSocketClientMock } from '../utils/test-helpers';

const mockClient = createWebSocketClientMock();
vi.mock('../../lib/websocket/client', () => ({
  webSocketClient: mockClient,
}));
```

### tRPC Mocking

Use the shared tRPC mock factory:

```typescript
import { createTrpcMock } from '../utils/test-helpers';

const mockTrpc = createTrpcMock();
vi.mock('../../lib/api/trpc', () => ({
  trpc: mockTrpc,
}));
```

### Browser API Mocking

Browser APIs are mocked in `vitest.setup.ts`. If you need additional mocks, add them there.

## Test Coverage

Coverage thresholds are configured in `vitest.config.ts`. Aim for:

- Core business logic: > 90%
- UI components: > 80%
- Utilities: > 85%

## Debugging Tests

### Unit Tests

```bash
# Run tests in UI mode
bun test:ui

# Run with verbose output
bun test --reporter=verbose
```

### E2E Tests

```bash
# Run in headed mode
bunx playwright test --headed

# Run in debug mode
bunx playwright test --debug

# Use Playwright Inspector
bunx playwright test --ui
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Mock External Dependencies**: Mock APIs, WebSockets, and browser APIs
5. **Test Edge Cases**: Include tests for error conditions and edge cases
6. **Keep Tests Fast**: Unit tests should run quickly (< 1s each)
7. **E2E Tests for Critical Flows**: Use E2E tests for important user journeys

## Common Issues

### `document is not defined`

Ensure `vitest.config.ts` has `environment: 'jsdom'` set.

### `vi.mocked is not a function`

Use type assertions instead: `(mockFunction as any).mockReturnValue(...)`

### WebSocket mocks not working

Ensure mocks are set up before imports using `vi.mock()` at the top level.

### E2E tests timing out

Increase timeout in test or use `waitFor` with longer timeout.

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main/develop branches

See `.github/workflows/ci.yml` for configuration.

