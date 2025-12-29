/**
 * Real DeFi backtest engine
 * Fetches historical data, executes blocks, and calculates metrics
 */

import { LegoBlock } from '../types';
import { fetchHistoricalPrices, fetchMultipleTokenPrices, getPriceAtTimestamp, PriceDataPoint } from './backtest/dataFetcher';
import { PortfolioManager } from './backtest/portfolio';
import { executeBlockSequence, ExecutionContext } from './backtest/blockExecutor';
import { calculateMetrics } from './backtest/metricsCalculator';

export interface DeFiBacktestResult {
  metrics: {
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    winTrades: number;
    totalTrades: number;
    totalGasSpent: number;
    totalFeesSpent: number;
  };
  equityCurve: Array<{ date: string; equity: number }>;
}

export interface BacktestConfig {
  blocks: LegoBlock[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  rebalanceInterval: number;
}

/**
 * Extract unique tokens from blocks
 */
function extractTokens(blocks: LegoBlock[]): string[] {
  const tokens = new Set<string>();
  
  for (const block of blocks) {
    if (block.params.inputToken) {
      tokens.add(String(block.params.inputToken));
    }
    if (block.params.outputToken) {
      tokens.add(String(block.params.outputToken));
    }
    if (block.params.asset) {
      tokens.add(String(block.params.asset));
    }
  }
  
  return Array.from(tokens);
}

/**
 * Apply Aave interest to positions over time
 */
function applyAaveInterest(
  portfolio: PortfolioManager,
  prices: Map<string, number>,
  daysElapsed: number
): void {
  const positions = portfolio.getPositions();
  const aaveAPY = 0.05; // 5% APY (simplified, real Aave has variable rates)
  
  for (const position of positions) {
    if (position.protocol === 'Aave' && position.type === 'supply') {
      // Calculate interest earned
      const dailyRate = aaveAPY / 365;
      const interest = position.amount * dailyRate * daysElapsed;
      
      // Add interest to position
      position.amount += interest;
    }
  }
}

/**
 * Run a DeFi strategy backtest
 */
export async function runDeFiBacktest(config: BacktestConfig): Promise<DeFiBacktestResult> {
  const { blocks, startDate, endDate, initialCapital, rebalanceInterval } = config;

  if (blocks.length === 0) {
    throw new Error('Cannot backtest empty strategy');
  }

  // Extract tokens needed
  const tokens = extractTokens(blocks);
  if (tokens.length === 0) {
    throw new Error('No tokens found in strategy blocks');
  }

  // Determine interval based on rebalance interval
  const interval = rebalanceInterval < 3600000 ? 'hourly' : 'daily'; // < 1 hour = hourly

  // Fetch historical price data for all tokens
  let tokenPrices: Map<string, PriceDataPoint[]>;
  try {
    const priceMap = await fetchMultipleTokenPrices(tokens, startDate, endDate, interval);
    tokenPrices = priceMap;
    
    // Validate we have data for at least one token
    if (tokenPrices.size === 0) {
      throw new Error('No price data fetched for any token');
    }
    
    // Check if we have sufficient data points
    for (const [token, prices] of tokenPrices.entries()) {
      if (prices.length === 0) {
        console.warn(`Warning: No price data for ${token}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Price data fetch error:', errorMessage);
    throw new Error(`Failed to fetch price data: ${errorMessage}. Please check your internet connection and try again.`);
  }

  // Initialize portfolio
  const portfolio = new PortfolioManager(initialCapital);

  // Generate time points based on rebalance interval
  const timePoints: number[] = [];
  let currentTime = startDate.getTime();
  const endTime = endDate.getTime();

  while (currentTime <= endTime) {
    timePoints.push(currentTime);
    currentTime += rebalanceInterval;
  }

  // Ensure we have end time
  if (timePoints[timePoints.length - 1] !== endTime) {
    timePoints.push(endTime);
  }

  // Run backtest
  const equityCurve: number[] = [];
  const equityCurveData: Array<{ date: string; equity: number }> = [];
  let lastExecutionTime = startDate.getTime();

  for (let i = 0; i < timePoints.length; i++) {
    const timestamp = timePoints[i];
    const currentDate = new Date(timestamp);

    // Get current prices for all tokens
    const currentPrices = new Map<string, number>();
    for (const token of tokens) {
      const prices = tokenPrices.get(token);
      if (prices && prices.length > 0) {
        try {
          const price = getPriceAtTimestamp(prices, timestamp);
          if (price > 0) {
            currentPrices.set(token, price);
          } else {
            // Fallback to last known price
            const lastPrice = prices[prices.length - 1];
            if (lastPrice && lastPrice.price > 0) {
              currentPrices.set(token, lastPrice.price);
            }
          }
        } catch (error) {
          // Use last known price if interpolation fails
          const lastPrice = prices[prices.length - 1];
          if (lastPrice && lastPrice.price > 0) {
            currentPrices.set(token, lastPrice.price);
          } else {
            console.warn(`Warning: No valid price data for ${token} at ${currentDate.toISOString()}`);
          }
        }
      } else {
        console.warn(`Warning: No price data available for ${token}`);
      }
    }
    
    // Skip this iteration if we don't have prices for required tokens
    if (currentPrices.size === 0) {
      console.warn(`Skipping backtest iteration at ${currentDate.toISOString()}: No price data available`);
      continue;
    }

    // Apply interest to Aave positions
    const daysSinceLastExecution = (timestamp - lastExecutionTime) / (1000 * 60 * 60 * 24);
    if (daysSinceLastExecution > 0) {
      applyAaveInterest(portfolio, currentPrices, daysSinceLastExecution);
    }

    // Create execution context
    const context: ExecutionContext = {
      timestamp,
      prices: currentPrices,
      portfolio,
      previousResults: new Map(),
    };

    // Execute blocks
    try {
      executeBlockSequence(blocks, context);
    } catch (error) {
      console.warn(`Error executing blocks at ${currentDate.toISOString()}:`, error);
      // Continue with backtest
    }

    // Calculate current equity
    const equity = portfolio.calculateEquity(currentPrices);
    equityCurve.push(equity);
    equityCurveData.push({
      date: currentDate.toISOString(),
      equity,
    });

    lastExecutionTime = timestamp;
  }

  // Calculate final metrics
  const metrics = calculateMetrics(portfolio, initialCapital, equityCurve);

  return {
    metrics: {
      sharpeRatio: metrics.sharpeRatio,
      totalReturn: metrics.totalReturn,
      maxDrawdown: metrics.maxDrawdown,
      winTrades: metrics.winTrades,
      totalTrades: metrics.totalTrades,
      totalGasSpent: metrics.totalGasSpent,
      totalFeesSpent: metrics.totalFeesSpent,
    },
    equityCurve: equityCurveData,
  };
}
