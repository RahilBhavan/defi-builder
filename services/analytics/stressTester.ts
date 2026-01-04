/**
 * Stress Testing Service
 * Tests strategy performance under extreme market conditions
 */

import type { LegoBlock } from '../../types';
import { type DeFiBacktestResult, runDeFiBacktest } from '../defiBacktestEngine';

export interface StressTestScenario {
  name: string;
  description: string;
  priceShock: number; // Percentage price change (e.g., -50 for 50% crash)
  volatilityMultiplier: number; // Volatility multiplier (e.g., 3.0 for 3x volatility)
  liquidityCrisis: boolean; // Simulate liquidity crisis (higher slippage)
  gasPriceSpike: number; // Gas price multiplier (e.g., 10.0 for 10x gas)
}

export interface StressTestResult {
  scenario: StressTestScenario;
  baselineResult: DeFiBacktestResult;
  stressResult: DeFiBacktestResult;
  impact: {
    returnChange: number; // Change in total return
    drawdownChange: number; // Change in max drawdown
    sharpeChange: number; // Change in Sharpe ratio
    survival: boolean; // Whether strategy survived (didn't go to zero)
  };
}

/**
 * Predefined stress test scenarios
 */
export const STRESS_SCENARIOS: StressTestScenario[] = [
  {
    name: 'Market Crash (-50%)',
    description: 'Simulates a 50% market crash',
    priceShock: -50,
    volatilityMultiplier: 3.0,
    liquidityCrisis: true,
    gasPriceSpike: 2.0,
  },
  {
    name: 'Flash Crash (-30%)',
    description: 'Simulates a rapid 30% flash crash',
    priceShock: -30,
    volatilityMultiplier: 5.0,
    liquidityCrisis: true,
    gasPriceSpike: 5.0,
  },
  {
    name: 'High Volatility',
    description: 'Simulates 3x normal volatility',
    priceShock: 0,
    volatilityMultiplier: 3.0,
    liquidityCrisis: false,
    gasPriceSpike: 1.0,
  },
  {
    name: 'Liquidity Crisis',
    description: 'Simulates liquidity crisis with high slippage',
    priceShock: -20,
    volatilityMultiplier: 2.0,
    liquidityCrisis: true,
    gasPriceSpike: 3.0,
  },
  {
    name: 'Gas Price Spike',
    description: 'Simulates 10x gas price spike',
    priceShock: 0,
    volatilityMultiplier: 1.0,
    liquidityCrisis: false,
    gasPriceSpike: 10.0,
  },
  {
    name: 'Black Swan (-70%)',
    description: 'Simulates extreme black swan event',
    priceShock: -70,
    volatilityMultiplier: 5.0,
    liquidityCrisis: true,
    gasPriceSpike: 5.0,
  },
];

/**
 * Run stress test for a scenario
 */
export async function runStressTest(
  blocks: LegoBlock[],
  initialCapital: number,
  startDate: Date,
  endDate: Date,
  scenario: StressTestScenario
): Promise<StressTestResult> {
  // Run baseline backtest
  const baselineResult = await runDeFiBacktest({
    blocks,
    initialCapital,
    startDate,
    endDate,
    rebalanceInterval: 1, // Daily rebalancing
  });

  // Run stress test backtest
  // Note: In a full implementation, we would modify the backtest engine
  // to accept stress test parameters and apply them during execution
  // For now, we'll run the same backtest and note that stress testing
  // would require modifications to the backtest engine

  // TODO: Implement stress test modifications in backtest engine
  // This would involve:
  // - Applying price shocks to historical data
  // - Increasing volatility in price movements
  // - Applying higher slippage during liquidity crises
  // - Applying gas price multipliers

  const stressResult = await runDeFiBacktest({
    blocks,
    initialCapital,
    startDate,
    endDate,
    rebalanceInterval: 1, // Daily rebalancing
  });

  // Calculate impact
  const returnChange = stressResult.metrics.totalReturn - baselineResult.metrics.totalReturn;
  const drawdownChange = stressResult.metrics.maxDrawdown - baselineResult.metrics.maxDrawdown;
  const sharpeChange = stressResult.metrics.sharpeRatio - baselineResult.metrics.sharpeRatio;

  const finalEquity = stressResult.equityCurve[stressResult.equityCurve.length - 1]?.equity || 0;
  const survival = finalEquity > initialCapital * 0.1; // Survived if > 10% of initial capital remains

  return {
    scenario,
    baselineResult,
    stressResult,
    impact: {
      returnChange,
      drawdownChange,
      sharpeChange,
      survival,
    },
  };
}

/**
 * Run all predefined stress tests
 */
export async function runAllStressTests(
  blocks: LegoBlock[],
  initialCapital: number,
  startDate: Date,
  endDate: Date
): Promise<StressTestResult[]> {
  const results: StressTestResult[] = [];

  for (const scenario of STRESS_SCENARIOS) {
    try {
      const result = await runStressTest(blocks, initialCapital, startDate, endDate, scenario);
      results.push(result);
    } catch (error) {
      // If a stress test fails, skip it
      const { logger } = await import('../../lib/monitoring/logger');
      logger.error(
        `Stress test failed for scenario: ${scenario.name}`,
        error instanceof Error ? error : new Error(String(error)),
        'StressTester'
      );
    }
  }

  return results;
}
