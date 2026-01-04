# DeFi Builder Mock API Server

A comprehensive API mocking framework designed specifically for DeFi Builder development and testing.

## Features

- **Realistic DeFi Data Generation**: Automatically generates realistic token prices, liquidity pools, and transaction data
- **Scenario-Based Testing**: Pre-configured scenarios for bull markets, bear markets, flash crashes, and more
- **Request/Response Stubbing**: Flexible stubbing engine with matchers and conditions
- **Performance Simulation**: Simulate network latency, rate limiting, and errors
- **Testing Framework Integration**: Seamless integration with Vitest and Playwright
- **Request Tracking**: Track and verify all mock requests for testing

## Quick Start

### 1. Start the Mock Server

```typescript
import { MockAPIServer } from './mocks/mockServer';
import { DeFiMocks } from './mocks/defiMocks';

const server = new MockAPIServer(3001);

// Load DeFi mocks
const mocks = DeFiMocks.getAllMocks();
for (const mock of mocks) {
  server.addStub(mock);
}

await server.start();
console.log('Mock server running on http://localhost:3001');
```

### 2. Use in Tests

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vitestMockHelpers } from './mocks/testingIntegration';

beforeAll(async () => {
  await vitestMockHelpers.setup(3001);
});

afterAll(async () => {
  await vitestMockHelpers.teardown();
});

beforeEach(() => {
  vitestMockHelpers.reset();
});

describe('Price Feed', () => {
  it('should fetch ETH price', async () => {
    const response = await fetch('http://localhost:3001/api/price/ETH');
    const data = await response.json();

    expect(data.token).toBe('ETH');
    expect(data.price).toBeGreaterThan(0);
  });
});
```

## Mock Scenarios

### Available Scenarios

```typescript
// Set scenario
server.setScenario('bull_market');

// Available scenarios:
// - default: Standard happy path
// - happy_path: All operations succeed
// - error_scenario: Various error conditions
// - slow_responses: Simulate network delays
// - bull_market: Rising prices, high liquidity
// - bear_market: Falling prices, reduced liquidity
// - flash_crash: Sudden price crash
// - network_congestion: High gas prices, slow confirmations
// - high_volatility: Rapid price changes
// - low_liquidity: High slippage
// - mev_attack: MEV bot simulation
// - liquidation_cascade: Mass liquidation event
```

### Using Scenarios in Tests

```typescript
import { testScenarios, vitestMockHelpers } from './mocks/testingIntegration';

it('should handle bull market conditions', async () => {
  const server = vitestMockHelpers.getServer();
  testScenarios.bullMarket(server);

  // Prices will be 50% higher than base
  const price = await getTokenPrice('ETH');
  expect(price).toBeGreaterThan(2000);
});

it('should handle flash crash', async () => {
  const server = vitestMockHelpers.getServer();
  testScenarios.flashCrash(server);

  // Prices will drop 60%
  const price = await getTokenPrice('ETH');
  expect(price).toBeLessThan(1000);
});
```

## Creating Custom Stubs

### Using StubBuilder

```typescript
import { StubBuilder } from './mocks/stubbingEngine';

// Simple stub
const stub = new StubBuilder()
  .when('GET', '/api/price/ETH')
  .thenReturn(200, { price: 2000, token: 'ETH' })
  .build();

server.addStub(stub);

// Stub with matchers
const stub = new StubBuilder()
  .when('POST', '/api/swap')
  .withBody({ tokenIn: 'ETH', tokenOut: 'USDC' })
  .thenReturn(200, { success: true })
  .build();

// Stub with conditions
const stub = new StubBuilder()
  .when('POST', '/api/transaction/submit')
  .withCondition(
    { body: { value: '10000000000000000000' } },
    { status: 400, body: { error: 'Insufficient funds' } }
  )
  .thenReturn(200, { hash: '0x123...' })
  .build();

// Stub with priority and call limits
const stub = new StubBuilder()
  .when('GET', '/api/rate-limited')
  .thenReturn(200, { data: 'success' })
  .withPriority(10)
  .times(5) // Only match 5 times
  .build();
```

### Using MockBuilder in Tests

```typescript
import { MockBuilder } from './mocks/testingIntegration';

it('should handle custom mock', async () => {
  const server = vitestMockHelpers.getServer();
  const mockBuilder = new MockBuilder(server);

  mockBuilder
    .when('GET', '/api/custom-endpoint')
    .thenReturn(200, { custom: 'data' });

  const response = await fetch('http://localhost:3001/api/custom-endpoint');
  const data = await response.json();

  expect(data.custom).toBe('data');
});
```

## Dynamic Data Generation

### Generate Realistic Data

```typescript
import { MockDataGenerator } from './mocks/dataGenerator';

const generator = new MockDataGenerator();

// Generate price data
const price = generator.generatePriceData('ETH');
console.log(price);
// {
//   token: 'ETH',
//   price: 2000.45,
//   timestamp: 1234567890,
//   change24h: 5.2,
//   volume24h: 15000000,
//   marketCap: 240000000000
// }

// Generate pool data
const pool = generator.generatePoolData('ETH', 'USDC');
console.log(pool);
// {
//   address: '0x...',
//   token0: 'ETH',
//   token1: 'USDC',
//   reserve0: '1000.0',
//   reserve1: '2000000.0',
//   fee: 0.003,
//   apy: 15.5,
//   tvl: 4000000
// }

// Generate backtest results
const backtest = generator.generateBacktestData();
console.log(backtest.metrics);
// {
//   totalReturn: 45.2,
//   sharpeRatio: 2.1,
//   maxDrawdown: 12.5,
//   winRate: 62.5,
//   profitFactor: 2.3
// }
```

### Custom Schema Generation

```typescript
const customData = generator.generate({
  type: 'object',
  properties: {
    token: { type: 'string', enum: ['ETH', 'USDC', 'DAI'] },
    balance: { type: 'number', min: 0, max: 1000 },
    address: { type: 'string', format: 'address' }
  }
});
```

## Request Verification

### Verify Mocks Were Called

```typescript
it('should call the swap endpoint', async () => {
  const server = vitestMockHelpers.getServer();
  const mockBuilder = new MockBuilder(server);

  // Setup mock
  mockBuilder
    .when('POST', '/api/swap')
    .thenReturn(200, { success: true });

  // Make request
  await executeSwap('ETH', 'USDC', '1.0');

  // Verify
  const verifier = mockBuilder.verify();

  expect(verifier.wasCalledWith('POST', '/api/swap')).toBe(true);
  expect(verifier.wasCalledTimes('POST', '/api/swap', 1)).toBe(true);

  // Verify with body matcher
  expect(verifier.wasCalledWith(
    'POST',
    '/api/swap',
    (body) => body.tokenIn === 'ETH'
  )).toBe(true);

  // Get last request
  const lastRequest = verifier.getLastRequest('POST', '/api/swap');
  expect(lastRequest.body.amountIn).toBe('1000000000000000000');
});
```

## Available Endpoints

### Price Feed

```
GET  /api/price/:token              - Get current token price
GET  /api/price/:token/history      - Get historical prices
POST /api/price/batch               - Get multiple token prices
```

### Liquidity Pools

```
GET  /api/pool/:address             - Get pool information
GET  /api/pools                     - List all pools
GET  /api/pool/:address/reserves    - Get pool reserves
POST /api/pool/:address/quote       - Calculate swap output
```

### Transactions

```
POST /api/transaction/submit        - Submit transaction
GET  /api/transaction/:hash         - Get transaction status
GET  /api/transactions              - Get transaction history
POST /api/transaction/simulate      - Simulate transaction
```

### Backtesting

```
POST /api/backtest/run              - Run backtest
GET  /api/backtest/:id              - Get backtest results
GET  /api/backtests                 - List backtests
```

### Strategies

```
POST /api/strategy                  - Create strategy
GET  /api/strategy/:id              - Get strategy
GET  /api/strategies                - List strategies
POST /api/strategy/:id/validate     - Validate strategy
```

### Gas Estimation

```
GET  /api/gas/prices                - Get current gas prices
POST /api/gas/estimate              - Estimate gas for transaction
```

## Admin Endpoints

```
POST /admin/scenario                - Change scenario
POST /admin/reset                   - Reset mock state
GET  /admin/requests                - Get request history
GET  /health                        - Health check
```

## Performance Testing

### Simulate Network Conditions

The mock server automatically simulates realistic latency:
- Price feeds: 50-150ms
- Transactions: 200-700ms
- Backtests: 1-3 seconds

Configure custom delays:

```typescript
const stub = new StubBuilder()
  .when('GET', '/api/slow-endpoint')
  .withDelay(5000) // 5 second delay
  .thenReturn(200, { data: 'slow response' })
  .build();
```

### Simulate Errors

```typescript
const stub = new StubBuilder()
  .when('GET', '/api/flaky-endpoint')
  .thenReturn(200, { data: 'success' })
  .withTransformation({
    type: 'error_rate',
    params: {
      rate: 0.3, // 30% error rate
      status: 500,
      body: { error: 'Random failure' }
    }
  })
  .build();
```

## Best Practices

1. **Reset Between Tests**: Always reset mock state between tests
   ```typescript
   beforeEach(() => {
     vitestMockHelpers.reset();
   });
   ```

2. **Use Scenarios**: Leverage pre-built scenarios instead of manually mocking everything
   ```typescript
   testScenarios.bullMarket(server); // vs creating many stubs
   ```

3. **Verify Requests**: Always verify that expected API calls were made
   ```typescript
   expect(mockBuilder.verify().wasCalledWith('POST', '/api/swap')).toBe(true);
   ```

4. **Use Realistic Data**: The generators create realistic data - use them!
   ```typescript
   const pool = generator.generatePoolData('ETH', 'USDC');
   // vs hardcoding { reserve0: '1000', reserve1: '2000' }
   ```

5. **Test Error Paths**: Use error scenarios to test error handling
   ```typescript
   testScenarios.withErrors(server);
   await expect(executeSwap()).rejects.toThrow();
   ```

## Examples

See `/backend/src/mocks/testingIntegration.ts` for complete test examples.

## Architecture

```
mocks/
├── mockServer.ts           - Main mock server
├── stubbingEngine.ts       - Request/response matching
├── dataGenerator.ts        - Realistic data generation
├── scenarioManager.ts      - Test scenarios
├── requestTracker.ts       - Request tracking
├── defiMocks.ts           - Pre-configured DeFi mocks
├── testingIntegration.ts  - Test framework helpers
├── types.ts               - Type definitions
└── README.md              - This file
```

## Troubleshooting

### Mock server not starting

```bash
# Check if port is already in use
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Requests not matching

Enable debug logging to see matching details:

```typescript
import { logger } from '../utils/logger';
logger.level = 'debug';
```

### Data not realistic

Adjust data generation parameters:

```typescript
const generator = new MockDataGenerator();
generator.updatePrice('ETH', 3000); // Set custom price
generator.simulateMarketCrash(0.5); // 50% crash
```

## Contributing

When adding new mocks:

1. Add type definitions to `types.ts`
2. Create data generators in `dataGenerator.ts`
3. Add pre-configured mocks to `defiMocks.ts`
4. Update this README with examples

## License

MIT
