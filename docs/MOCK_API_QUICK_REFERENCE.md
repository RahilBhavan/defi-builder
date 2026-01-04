# Mock API Quick Reference

## Quick Start

```bash
# Start mock server
npm run mock:server

# With scenario
npm run mock:server:bull     # Bull market
npm run mock:server:bear     # Bear market
npm run mock:server:crash    # Flash crash

# Run example tests
npm run test:mock
```

## Test Setup

```typescript
import { vitestMockHelpers, MockBuilder, testScenarios } from '@/backend/src/mocks';

beforeAll(() => vitestMockHelpers.setup(3001));
afterAll(() => vitestMockHelpers.teardown());
beforeEach(() => vitestMockHelpers.reset());
```

## Common Scenarios

```typescript
const server = vitestMockHelpers.getServer();

testScenarios.happyPath(server);          // Default
testScenarios.withErrors(server);         // Random errors
testScenarios.withSlowResponses(server);  // Network delays
testScenarios.bullMarket(server);         // +50% prices
testScenarios.bearMarket(server);         // -30% prices
testScenarios.flashCrash(server);         // -60% crash
testScenarios.networkCongestion(server);  // High gas
```

## Custom Mocks

```typescript
const mockBuilder = new MockBuilder(server);

// Simple mock
mockBuilder
  .when('GET', '/api/price/ETH')
  .thenReturn(200, { price: 2000 });

// With query params
mockBuilder
  .when('GET', '/api/price/ETH')
  .withQueryParams({ currency: 'USD' })
  .thenReturn(200, { price: 2000 });

// With body
mockBuilder
  .when('POST', '/api/swap')
  .withBody({ tokenIn: 'ETH', tokenOut: 'USDC' })
  .thenReturn(200, { success: true });
```

## Verification

```typescript
// Was called?
mockBuilder.verify().wasCalledWith('POST', '/api/swap')

// Call count
mockBuilder.verify().wasCalledTimes('POST', '/api/swap', 3)

// With body matcher
mockBuilder.verify().wasCalledWith(
  'POST',
  '/api/swap',
  (body) => body.tokenIn === 'ETH'
)

// Get last request
const req = mockBuilder.verify().getLastRequest('POST', '/api/swap')
```

## Available Endpoints

### Price Feed
```
GET  /api/price/:token
GET  /api/price/:token/history
POST /api/price/batch
```

### Pools
```
GET  /api/pool/:address
GET  /api/pools
POST /api/pool/:address/quote
```

### Transactions
```
POST /api/transaction/submit
GET  /api/transaction/:hash
POST /api/transaction/simulate
```

### Backtesting
```
POST /api/backtest/run
GET  /api/backtest/:id
GET  /api/backtests
```

### Strategies
```
POST /api/strategy
GET  /api/strategy/:id
GET  /api/strategies
POST /api/strategy/:id/validate
```

### Gas
```
GET /api/gas/prices
POST /api/gas/estimate
```

### Admin
```
POST /admin/scenario
POST /admin/reset
GET  /admin/requests
GET  /health
```

## Data Generation

```typescript
import { MockDataGenerator } from '@/backend/src/mocks';

const generator = new MockDataGenerator();

// Price data
generator.generatePriceData('ETH')

// Pool data
generator.generatePoolData('ETH', 'USDC')

// Backtest results
generator.generateBacktestData()

// Transaction
generator.generateTransactionData()
```

## Scenarios

| Scenario | Price | Liquidity | Volatility | Gas |
|----------|-------|-----------|------------|-----|
| default | 1.0x | 1.0x | 2% | 1.0x |
| bull_market | 1.5x | 2.0x | 2% | 1.0x |
| bear_market | 0.7x | 0.5x | 5% | 1.0x |
| flash_crash | 0.4x | 1.0x | 15% | 1.0x |
| network_congestion | 1.0x | 1.0x | 2% | 5.0x |
| high_volatility | 1.0x | 1.0x | 10% | 1.0x |
| low_liquidity | 1.0x | 0.2x | 2% | 1.0x |

## Example Test

```typescript
describe('Swap Strategy', () => {
  beforeEach(() => vitestMockHelpers.reset());

  it('should execute swap successfully', async () => {
    const server = vitestMockHelpers.getServer();
    const mockBuilder = new MockBuilder(server);

    // Setup
    testScenarios.happyPath(server);

    mockBuilder
      .when('POST', '/api/pool/0x123/swap')
      .thenReturn(200, {
        amountOut: '2000000000',
        txHash: '0xabc123'
      });

    // Execute
    const result = await executeSwap('ETH', 'USDC', '1.0');

    // Verify
    expect(result.success).toBe(true);
    expect(mockBuilder.verify().wasCalledWith(
      'POST',
      '/api/pool/0x123/swap'
    )).toBe(true);
  });

  it('should handle slippage error', async () => {
    const mockBuilder = new MockBuilder(server);

    mockBuilder
      .when('POST', '/api/pool/0x123/swap')
      .thenReturn(400, {
        error: 'Slippage tolerance exceeded'
      });

    await expect(
      executeSwap('ETH', 'USDC', '1.0')
    ).rejects.toThrow('Slippage');
  });
});
```

## Playwright Integration

```typescript
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url().replace(
      /^.*?\/api\//,
      'http://localhost:3001/api/'
    );
    const response = await fetch(url);
    const body = await response.text();
    route.fulfill({ status: response.status, body });
  });
});
```

## Change Scenario at Runtime

```bash
# Via curl
curl -X POST http://localhost:3001/admin/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"bull_market"}'

# Via fetch
await fetch('http://localhost:3001/admin/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'bull_market' })
});
```

## Reset State

```bash
curl -X POST http://localhost:3001/admin/reset
```

## Check Health

```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Port in use
```bash
lsof -i :3001
kill -9 <PID>
```

### Enable debug logging
```typescript
import { logger } from '@/backend/src/utils/logger';
logger.level = 'debug';
```

### Check request history
```typescript
const requests = server.getRequests();
console.log(requests);
```

## Resources

- [Full Guide](./MOCK_API_GUIDE.md)
- [README](../backend/src/mocks/README.md)
- [Examples](../__tests__/examples/mock-api-usage.test.ts)
