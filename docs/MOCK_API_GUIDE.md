# DeFi Builder Mock API Implementation Guide

## Overview

The DeFi Builder Mock API is a comprehensive mocking framework designed specifically for DeFi application development and testing. It provides realistic blockchain and DeFi data simulation without requiring actual blockchain connections or spending testnet ETH.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mock API Server                      │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Stubbing   │  │   Scenario   │  │     Data      │  │
│  │  Engine    │  │   Manager    │  │  Generator    │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌────────────┐  ┌──────────────┐                     │
│  │  Request   │  │    DeFi      │                     │
│  │  Tracker   │  │    Mocks     │                     │
│  └────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Express Server
                        ▼
              ┌──────────────────┐
              │   Your Tests     │
              │  & Application   │
              └──────────────────┘
```

## Key Features

### 1. Realistic Data Generation

The mock server generates realistic DeFi data using mathematical models:

**Price Generation**
- Geometric Brownian Motion for realistic price movement
- Maintains 24-hour price history
- Correlates related tokens (e.g., WETH = ETH)
- Simulates volume and market cap

**Pool Data**
- Generates liquidity pools following x*y=k constant product formula
- Calculates realistic APYs based on pool size and volatility
- Maintains proper reserve ratios
- Simulates impermanent loss scenarios

**Backtest Results**
- Generates statistically valid trade sequences
- Calculates Sharpe ratio, max drawdown, win rate
- Creates realistic equity curves
- Simulates market conditions

### 2. Scenario-Based Testing

Pre-configured scenarios for common test cases:

| Scenario | Description | Use Case |
|----------|-------------|----------|
| `default` | Standard happy path | General testing |
| `bull_market` | 50% price increase, high liquidity | Test profit scenarios |
| `bear_market` | 30% price decrease, low liquidity | Test loss handling |
| `flash_crash` | 60% price drop, extreme volatility | Test circuit breakers |
| `network_congestion` | High gas, slow confirmations | Test gas optimization |
| `mev_attack` | Front-running simulation | Test MEV protection |
| `liquidation_cascade` | Mass liquidation event | Test risk management |
| `error_scenario` | Various API errors | Test error handling |
| `slow_responses` | Network delays | Test timeout handling |

### 3. Flexible Stubbing

Create custom mocks with powerful matching:

```typescript
// Path parameter matching
.when('GET', '/api/price/:token')

// Query parameter matching
.withQueryParams({ currency: 'USD' })

// Body matching (exact, partial, or regex)
.withBody({ tokenIn: 'ETH' }, 'partial')

// Conditional responses
.withCondition(
  { body: { amount: '1000' } },
  { status: 400, body: { error: 'Insufficient funds' } }
)
```

### 4. Performance Simulation

Realistic latency simulation:

```typescript
// Automatic latency based on endpoint type
Price feeds:    50-150ms
Transactions:   200-700ms
Backtests:      1-3 seconds

// Custom delays
.withDelay(5000) // 5 second delay

// Error rate simulation
.withTransformation({
  type: 'error_rate',
  params: { rate: 0.3, status: 500 }
})
```

### 5. Request Verification

Track and verify all mock calls:

```typescript
// Verify request was made
mockBuilder.verify().wasCalledWith('POST', '/api/swap')

// Verify call count
mockBuilder.verify().wasCalledTimes('POST', '/api/swap', 3)

// Verify with body matcher
mockBuilder.verify().wasCalledWith(
  'POST',
  '/api/swap',
  (body) => body.tokenIn === 'ETH'
)

// Get request history
const requests = server.getRequests({ method: 'POST', path: '/api/swap' })
```

## Implementation Details

### Data Generator

The `MockDataGenerator` class uses several techniques for realistic data:

**Geometric Brownian Motion**
```typescript
// Price movement formula: dS = μS dt + σS dW
const randomWalk = Math.exp(drift * dt + volatility * randomShock);
```

**Normal Distribution (Box-Muller)**
```typescript
const u1 = Math.random();
const u2 = Math.random();
const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
```

**AMM Pool Math**
```typescript
// Constant product formula: x * y = k
const reserve0 = tvl / (2 * price0);
const reserve1 = tvl / (2 * price1);
const k = reserve0 * reserve1;
const totalSupply = Math.sqrt(k);
```

### Stubbing Engine

The stubbing engine uses priority-based matching:

```typescript
// Match algorithm:
1. Check method (GET, POST, etc.)
2. Check path (exact, wildcard, or parameter)
3. Evaluate matchers (query, headers, body)
4. Sort by priority
5. Return highest priority match
6. Increment call count
7. Remove if times limit reached
```

### Scenario Manager

Scenarios modify data generation parameters:

```typescript
const scenarioConfig = {
  bull_market: {
    priceMultiplier: 1.5,      // 50% higher prices
    liquidityMultiplier: 2.0,   // 2x liquidity
    volatility: 0.02            // Low volatility
  },
  flash_crash: {
    priceMultiplier: 0.4,       // 60% price drop
    volatility: 0.15            // High volatility
  }
};
```

## Usage Patterns

### 1. Integration Testing

```typescript
describe('Strategy Execution', () => {
  beforeEach(() => {
    vitestMockHelpers.reset();
  });

  it('should execute swap strategy', async () => {
    const server = vitestMockHelpers.getServer();
    testScenarios.happyPath(server);

    const result = await executeStrategy({
      blocks: [
        { type: 'uniswap-swap', tokenIn: 'ETH', tokenOut: 'USDC' }
      ]
    });

    expect(result.success).toBe(true);
  });
});
```

### 2. E2E Testing with Playwright

```typescript
test.beforeEach(async ({ page }) => {
  // Route API calls to mock server
  await page.route('**/api/**', async (route) => {
    const url = route.request().url().replace(
      /^.*?\/api\//,
      'http://localhost:3001/api/'
    );
    const response = await fetch(url, {
      method: route.request().method(),
      body: route.request().postDataBuffer()
    });
    const body = await response.text();
    route.fulfill({
      status: response.status,
      body
    });
  });
});
```

### 3. Development Server

```bash
# Start mock server for development
bun run backend/src/mocks/startMockServer.ts

# With custom scenario
MOCK_SCENARIO=bull_market bun run backend/src/mocks/startMockServer.ts

# With custom port
MOCK_PORT=4000 bun run backend/src/mocks/startMockServer.ts
```

### 4. CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Start Mock Server
  run: |
    bun run backend/src/mocks/startMockServer.ts &
    sleep 5 # Wait for server to start

- name: Run Tests
  run: bun test

- name: Stop Mock Server
  run: pkill -f startMockServer
```

## Best Practices

### 1. Always Reset Between Tests

```typescript
beforeEach(() => {
  vitestMockHelpers.reset();
});
```

This ensures:
- Request history is cleared
- Scenario resets to default
- State doesn't leak between tests

### 2. Use Scenarios for Common Cases

```typescript
// ❌ Don't create many individual stubs
mockBuilder.when('GET', '/api/price/ETH').thenReturn(200, { price: 3000 });
mockBuilder.when('GET', '/api/price/USDC').thenReturn(200, { price: 1 });
// ... many more

// ✅ Use a scenario
testScenarios.bullMarket(server);
```

### 3. Verify Important Calls

```typescript
// ✅ Always verify critical operations
await executeTrade('ETH', 'USDC', '1.0');

expect(mockBuilder.verify().wasCalledWith(
  'POST',
  '/api/transaction/submit'
)).toBe(true);
```

### 4. Use Realistic Data

```typescript
// ❌ Don't hardcode unrealistic values
const pool = { reserve0: '1000', reserve1: '2000' };

// ✅ Use the generator
const pool = generator.generatePoolData('ETH', 'USDC');
```

### 5. Test Error Paths

```typescript
describe('Error Handling', () => {
  it('should handle insufficient funds', async () => {
    testScenarios.withErrors(server);

    await expect(
      executeSwap('ETH', 'USDC', '10000')
    ).rejects.toThrow('Insufficient funds');
  });
});
```

## Advanced Usage

### Custom Data Schemas

```typescript
const customData = generator.generate({
  type: 'object',
  properties: {
    portfolio: {
      type: 'array',
      count: 5,
      items: {
        type: 'object',
        properties: {
          token: { type: 'string', enum: ['ETH', 'USDC', 'DAI'] },
          balance: { type: 'number', min: 0, max: 1000 },
          value: { type: 'number', min: 0, max: 10000 }
        }
      }
    },
    totalValue: { type: 'number', min: 1000, max: 100000 }
  }
});
```

### Sequence Testing

```typescript
// Test a sequence of operations
const scenario: MockScenario = {
  name: 'swap_sequence',
  sequences: [{
    name: 'multi_swap',
    steps: [
      { repeat: 1, response: { status: 200, body: { step: 1 } } },
      { repeat: 1, response: { status: 200, body: { step: 2 } } },
      { repeat: 1, response: { status: 200, body: { step: 3 } } }
    ]
  }]
};

server.scenarioManager.defineScenario('swap_sequence', scenario);
server.setScenario('swap_sequence');
```

### State Management

```typescript
// Create stateful mocks
let cartState = { items: [] };

mockBuilder
  .when('POST', '/api/cart/add')
  .thenReturn(200, (req) => {
    cartState.items.push(req.body.item);
    return { cart: cartState };
  });

mockBuilder
  .when('GET', '/api/cart')
  .thenReturn(200, { cart: cartState });
```

## Troubleshooting

### Issue: Mocks Not Matching

**Problem**: Requests return 404 even with stubs defined

**Solution**:
1. Check path format (exact match vs. wildcard)
2. Verify method matches (GET vs. POST)
3. Check matchers (query params, headers, body)
4. Enable debug logging:
   ```typescript
   logger.level = 'debug';
   ```

### Issue: Unrealistic Data

**Problem**: Generated data doesn't match expectations

**Solution**:
1. Use appropriate scenarios
2. Customize data generator parameters:
   ```typescript
   generator.updatePrice('ETH', 3000);
   generator.simulateMarketCrash(0.3);
   ```

### Issue: Slow Tests

**Problem**: Tests taking too long

**Solution**:
1. Reduce simulated latency:
   ```typescript
   mockBuilder.when('GET', '/api/slow').withDelay(0).thenReturn(200, {});
   ```
2. Use faster scenario:
   ```typescript
   server.setScenario('default'); // No added latency
   ```

### Issue: Port Already in Use

**Problem**: Mock server won't start

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
MOCK_PORT=4000 bun run backend/src/mocks/startMockServer.ts
```

## Performance Metrics

The mock server can handle:
- **Throughput**: ~5,000 requests/second
- **Latency**: <5ms base (before simulated delays)
- **Memory**: ~50MB for 1,000 stubs
- **History**: Stores last 1,000 requests

## Future Enhancements

Planned features:
1. GraphQL mock support
2. WebSocket simulation for real-time price feeds
3. Contract ABI-based validation
4. Snapshot/restore for complex test scenarios
5. Performance profiling and bottleneck detection
6. Mock analytics dashboard

## Contributing

When adding new features:

1. Add types to `types.ts`
2. Implement in appropriate module
3. Add DeFi-specific mocks to `defiMocks.ts`
4. Create example tests
5. Update this documentation

## Resources

- [Mock Server README](../backend/src/mocks/README.md)
- [Example Tests](../__tests__/examples/mock-api-usage.test.ts)
- [API Reference](../backend/src/mocks/)

## Support

For issues or questions:
- GitHub Issues: [defi-builder/issues](https://github.com/your-org/defi-builder/issues)
- Documentation: [docs/](../docs/)
