# Backtest Engine

Real implementation of the DeFi backtest engine that fetches historical data, executes blocks, and calculates metrics.

## Architecture

### Components

1. **Data Fetcher** (`dataFetcher.ts`)
   - Fetches historical price data from CoinGecko API
   - Supports multiple tokens and timeframes
   - Implements caching to reduce API calls
   - Handles rate limiting and errors

2. **Portfolio Manager** (`portfolio.ts`)
   - Manages portfolio state (balances, positions)
   - Tracks trades and transactions
   - Calculates equity in USD

3. **Block Executor** (`blockExecutor.ts`)
   - Executes each block type with real logic
   - Handles conditional execution
   - Applies slippage and fees

4. **Metrics Calculator** (`metricsCalculator.ts`)
   - Calculates Sharpe ratio
   - Calculates maximum drawdown
   - Calculates win rate and other metrics

5. **Main Engine** (`defiBacktestEngine.ts`)
   - Orchestrates all components
   - Generates equity curve
   - Returns comprehensive results

## Usage

```typescript
import { runDeFiBacktest } from '../defiBacktestEngine';

const result = await runDeFiBacktest({
  blocks: strategyBlocks,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-01'),
  initialCapital: 10000,
  rebalanceInterval: 86400000, // 1 day
});

console.log(result.metrics);
console.log(result.equityCurve);
```

## Supported Block Types

### Price Trigger
- Checks if price meets condition (>=, <=, >, <, ==)
- Executes next blocks if condition is met

### Uniswap Swap
- Calculates swap amounts with slippage
- Applies 0.3% protocol fee
- Records trade with gas costs

### Aave Supply
- Supplies assets to Aave
- Earns interest over time (5% APY)
- Tracks position

### Stop Loss
- Monitors drawdown
- Exits positions if threshold exceeded

## Supported Tokens

- ETH (Ethereum)
- USDC (USD Coin)
- USDT (Tether)
- DAI (Dai)
- WBTC (Wrapped Bitcoin)
- AAVE (Aave Token)
- UNI (Uniswap Token)
- LINK (Chainlink)

## Data Source

Uses CoinGecko API (free tier):
- No API key required
- Rate limit: 10-50 calls/minute
- Historical data: up to 90 days per request
- Automatically chunks longer periods

## Metrics Calculated

- **Sharpe Ratio**: Risk-adjusted returns
- **Total Return**: Percentage gain/loss
- **Max Drawdown**: Maximum peak-to-trough decline
- **Win Rate**: Percentage of winning trades
- **Total Trades**: Number of executed trades
- **Gas Costs**: Total gas spent (in USD)
- **Protocol Fees**: Total fees paid

## Error Handling

- Network errors: Retries with exponential backoff
- Missing data: Uses interpolation or last known price
- Invalid blocks: Returns error with details
- Rate limiting: Queues requests, respects limits

## Performance

- Caches price data (5-minute TTL)
- Batches API requests
- Optimizes equity curve generation
- Uses efficient data structures

## Testing

Run tests with:
```bash
npm test services/backtest
```

## Future Improvements

- [ ] Support more block types
- [ ] Add more data sources (The Graph, Chainlink)
- [ ] Implement more sophisticated slippage models
- [ ] Add support for multiple DEXs
- [ ] Implement more accurate Aave interest calculations
- [ ] Add support for borrowing and leverage

