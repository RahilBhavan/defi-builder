# Backtest Engine Implementation Plan

## Overview
Replace the stub backtest engine with a real implementation that:
- Fetches historical price data from real APIs
- Executes blocks with actual logic
- Calculates real metrics (Sharpe ratio, drawdown, returns)
- Includes slippage and gas cost calculations
- Generates proper equity curve data

## Architecture

### 1. Data Layer
**File:** `services/backtest/dataFetcher.ts`
- Fetch historical price data from CoinGecko API (free, no API key required)
- Support multiple tokens (ETH, USDC, WBTC, etc.)
- Cache data to reduce API calls
- Handle rate limiting and errors gracefully
- Support different timeframes (hourly, daily)

### 2. Execution Layer
**File:** `services/backtest/blockExecutor.ts`
- Execute each block type with real logic:
  - `price_trigger`: Check if price condition is met
  - `uniswap_swap`: Calculate swap amounts with slippage
  - `aave_supply`: Calculate lending returns
  - `stop_loss`: Check drawdown thresholds
- Track portfolio state (balances, positions)
- Record trades and transactions

### 3. Metrics Layer
**File:** `services/backtest/metricsCalculator.ts`
- Calculate Sharpe ratio from returns
- Calculate maximum drawdown
- Calculate win rate and total trades
- Calculate total returns
- Calculate gas costs and fees

### 4. Main Engine
**File:** `services/defiBacktestEngine.ts` (refactor)
- Orchestrate data fetching, execution, and metrics
- Generate equity curve data points
- Handle rebalancing intervals
- Return comprehensive backtest results

## Implementation Steps

### Phase 1: Data Fetching
1. Create `dataFetcher.ts` with CoinGecko integration
2. Implement token price fetching
3. Add caching mechanism
4. Handle errors and rate limits

### Phase 2: Block Execution
1. Create `blockExecutor.ts`
2. Implement portfolio state management
3. Implement each block type execution
4. Add trade recording

### Phase 3: Metrics Calculation
1. Create `metricsCalculator.ts`
2. Implement Sharpe ratio calculation
3. Implement drawdown calculation
4. Implement other metrics

### Phase 4: Integration
1. Refactor `defiBacktestEngine.ts`
2. Wire everything together
3. Generate equity curve
4. Add comprehensive error handling

### Phase 5: Testing & Documentation
1. Add unit tests
2. Add integration tests
3. Update documentation
4. Add error handling examples

## Data Sources

### Primary: CoinGecko API
- **URL:** `https://api.coingecko.com/api/v3`
- **Free tier:** 10-50 calls/minute
- **Endpoints:**
  - Historical prices: `/coins/{id}/market_chart`
  - Current prices: `/simple/price`
- **Advantages:** Free, no API key, good coverage

### Fallback: Alternative APIs
- CoinCap API (backup)
- Manual data files (for offline testing)

## Block Execution Logic

### Price Trigger
- Check if current price meets condition (>=, <=, ==)
- Execute next block if condition is true
- Skip if false

### Uniswap Swap
- Calculate output amount using constant product formula (x * y = k)
- Apply slippage tolerance
- Update portfolio balances
- Record trade

### Aave Supply
- Calculate lending APY
- Update portfolio with interest
- Track supplied amount

### Stop Loss
- Calculate current drawdown
- Exit position if threshold exceeded
- Record exit trade

## Metrics Calculations

### Sharpe Ratio
```
Sharpe = (Mean Return - Risk Free Rate) / Standard Deviation of Returns
```
- Risk-free rate: 0% (or configurable)
- Annualized from daily returns

### Maximum Drawdown
```
Max Drawdown = Max((Peak - Trough) / Peak)
```
- Track peak equity
- Calculate drawdown at each point
- Return maximum

### Total Return
```
Total Return = (Final Equity - Initial Capital) / Initial Capital * 100
```

### Win Rate
```
Win Rate = Winning Trades / Total Trades * 100
```

## Gas Costs
- Base gas: 21,000 per transaction
- Gas price: Use historical averages or configurable
- Protocol-specific gas (Uniswap: ~150k, Aave: ~200k)

## Slippage
- Default: 0.5% (configurable per block)
- Applied to swap outputs
- Recorded in fees

## Error Handling
- Network errors: Retry with exponential backoff
- Missing data: Use interpolation or skip period
- Invalid blocks: Return error with details
- Rate limiting: Queue requests, respect limits

## Performance Considerations
- Cache price data to avoid repeated API calls
- Batch API requests when possible
- Use Web Workers for heavy calculations
- Optimize equity curve generation (sample points)

## Testing Strategy
1. Unit tests for each component
2. Integration tests for full backtest
3. Mock data for offline testing
4. Edge case testing (empty blocks, invalid dates, etc.)

