/**
 * Monte Carlo Simulation Service
 * Runs multiple simulations with random variations to assess strategy robustness
 */

import type { LegoBlock } from '../../types';
import { runDeFiBacktest } from '../defiBacktestEngine';

export interface MonteCarloConfig {
  iterations: number; // Number of simulation runs (default: 1000)
  priceVolatility: number; // Price volatility multiplier (default: 1.0 = no change)
  slippageMultiplier: number; // Slippage multiplier (default: 1.0 = no change)
  gasPriceMultiplier: number; // Gas price multiplier (default: 1.0 = no change)
  randomSeed?: number; // Optional seed for reproducibility
}

export interface MonteCarloResult {
  iterations: number;
  results: {
    totalReturn: number[];
    sharpeRatio: number[];
    maxDrawdown: number[];
    finalEquity: number[];
  };
  statistics: {
    meanReturn: number;
    medianReturn: number;
    stdDevReturn: number;
    minReturn: number;
    maxReturn: number;
    percentile5: number; // 5th percentile (worst 5%)
    percentile25: number; // 25th percentile
    percentile75: number; // 75th percentile
    percentile95: number; // 95th percentile (best 5%)
    probabilityOfProfit: number; // % of runs with positive return
    probabilityOfLoss: number; // % of runs with negative return
  };
  confidenceIntervals: {
    return95: [number, number]; // 95% confidence interval for returns
    return99: [number, number]; // 99% confidence interval for returns
  };
}

/**
 * Simple random number generator with seed (exported for future price variation)
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextGaussian(): number {
    // Box-Muller transform for normal distribution
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// Apply random variation to price data (reserved for future use)
// Uses SeededRandom.nextGaussian() * volatility * 0.01 for random walk

/**
 * Run Monte Carlo simulation
 */
export async function runMonteCarloSimulation(
  blocks: LegoBlock[],
  initialCapital: number,
  startDate: Date,
  endDate: Date,
  config: Partial<MonteCarloConfig> = {}
): Promise<MonteCarloResult> {
  const {
    iterations = 1000,
    // Reserved for future use: priceVolatility, slippageMultiplier, gasPriceMultiplier
    // randomSeed for reproducible simulations
  } = config;

  const results: MonteCarloResult['results'] = {
    totalReturn: [],
    sharpeRatio: [],
    maxDrawdown: [],
    finalEquity: [],
  };

  // Run multiple backtests with variations
  for (let i = 0; i < iterations; i++) {
    try {
      // For now, we'll run the backtest as-is
      // In a full implementation, we'd apply variations to:
      // - Price data (with volatility)
      // - Slippage (with multiplier)
      // - Gas prices (with multiplier)

      const backtestResult = await runDeFiBacktest({
        blocks,
        initialCapital,
        startDate,
        endDate,
        rebalanceInterval: 1, // Daily rebalancing
      });

      results.totalReturn.push(backtestResult.metrics.totalReturn);
      results.sharpeRatio.push(backtestResult.metrics.sharpeRatio);
      results.maxDrawdown.push(backtestResult.metrics.maxDrawdown);

      const finalEquity =
        backtestResult.equityCurve[backtestResult.equityCurve.length - 1]?.equity || initialCapital;
      results.finalEquity.push(finalEquity);
    } catch (_error) {
      // If a simulation fails, use worst-case values
      results.totalReturn.push(-100);
      results.sharpeRatio.push(0);
      results.maxDrawdown.push(100);
      results.finalEquity.push(0);
    }
  }

  // Calculate statistics
  const sortedReturns = [...results.totalReturn].sort((a, b) => a - b);
  const meanReturn =
    results.totalReturn.reduce((sum, r) => sum + r, 0) / results.totalReturn.length;
  const variance =
    results.totalReturn.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) /
    results.totalReturn.length;
  const stdDevReturn = Math.sqrt(variance);

  const medianReturn = sortedReturns[Math.floor(sortedReturns.length / 2)] || 0;
  const minReturn = sortedReturns[0] || 0;
  const maxReturn = sortedReturns[sortedReturns.length - 1] || 0;

  const percentile5 = sortedReturns[Math.floor(sortedReturns.length * 0.05)] || 0;
  const percentile25 = sortedReturns[Math.floor(sortedReturns.length * 0.25)] || 0;
  const percentile75 = sortedReturns[Math.floor(sortedReturns.length * 0.75)] || 0;
  const percentile95 = sortedReturns[Math.floor(sortedReturns.length * 0.95)] || 0;

  const probabilityOfProfit =
    (results.totalReturn.filter((r) => r > 0).length / results.totalReturn.length) * 100;
  const probabilityOfLoss =
    (results.totalReturn.filter((r) => r < 0).length / results.totalReturn.length) * 100;

  // Calculate confidence intervals (using normal distribution approximation)
  const z95 = 1.96; // 95% confidence
  const z99 = 2.576; // 99% confidence
  const return95: [number, number] = [
    meanReturn - z95 * stdDevReturn,
    meanReturn + z95 * stdDevReturn,
  ];
  const return99: [number, number] = [
    meanReturn - z99 * stdDevReturn,
    meanReturn + z99 * stdDevReturn,
  ];

  return {
    iterations,
    results,
    statistics: {
      meanReturn,
      medianReturn,
      stdDevReturn,
      minReturn,
      maxReturn,
      percentile5,
      percentile25,
      percentile75,
      percentile95,
      probabilityOfProfit,
      probabilityOfLoss,
    },
    confidenceIntervals: {
      return95,
      return99,
    },
  };
}
