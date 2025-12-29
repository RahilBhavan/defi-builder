/**
 * Advanced metrics calculation for backtest results
 */

import type { DeFiBacktestResult } from '../services/defiBacktestEngine';

export interface AdvancedMetrics {
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  beta: number;
  alpha: number;
  volatility: number;
  downsideVolatility: number;
}

/**
 * Calculate Sortino Ratio
 * Sortino = (Mean Return - Risk Free Rate) / Downside Deviation
 * Only penalizes negative returns (downside volatility)
 */
export function calculateSortinoRatio(returns: number[], riskFreeRate = 0): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const annualizedReturn = meanReturn * 365;

  // Calculate downside deviation (only negative returns)
  const negativeReturns = returns.filter((r) => r < 0);
  if (negativeReturns.length === 0) return Number.POSITIVE_INFINITY; // No downside risk

  const downsideMean = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
  const downsideVariance =
    negativeReturns.reduce((sum, r) => sum + Math.pow(r - downsideMean, 2), 0) /
    negativeReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const annualizedDownsideDev = downsideDeviation * Math.sqrt(365);

  if (annualizedDownsideDev === 0) return 0;

  return (annualizedReturn - riskFreeRate) / annualizedDownsideDev;
}

/**
 * Calculate Calmar Ratio
 * Calmar = Annual Return / Maximum Drawdown
 */
export function calculateCalmarRatio(
  totalReturn: number,
  maxDrawdown: number,
  days: number
): number {
  if (maxDrawdown === 0) return Number.POSITIVE_INFINITY;
  if (days === 0) return 0;

  // Annualize return
  const annualizedReturn = (totalReturn / 100) * (365 / days);

  return annualizedReturn / (maxDrawdown / 100);
}

/**
 * Calculate Information Ratio
 * Information Ratio = (Portfolio Return - Benchmark Return) / Tracking Error
 * For now, using HODL as benchmark
 */
export function calculateInformationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length === 0 || benchmarkReturns.length === 0) return 0;
  if (portfolioReturns.length !== benchmarkReturns.length) return 0;

  // Calculate excess returns
  const excessReturns = portfolioReturns.map((pr, i) => {
    const benchmark = benchmarkReturns[i];
    return benchmark !== undefined ? pr - benchmark : 0;
  });
  const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;

  // Calculate tracking error (std dev of excess returns)
  const variance =
    excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) /
    excessReturns.length;
  const trackingError = Math.sqrt(variance) * Math.sqrt(365); // Annualized

  if (trackingError === 0) return 0;

  return (meanExcessReturn * 365) / trackingError;
}

/**
 * Calculate Beta (sensitivity to market)
 * Beta = Covariance(Portfolio, Market) / Variance(Market)
 * Simplified: using correlation * (portfolio volatility / market volatility)
 */
export function calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
  if (portfolioReturns.length === 0 || marketReturns.length === 0) return 1;
  if (portfolioReturns.length !== marketReturns.length) return 1;

  // Calculate means
  const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
  const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;

  // Calculate covariance
  let covariance = 0;
  for (let i = 0; i < portfolioReturns.length; i++) {
    const portfolioReturn = portfolioReturns[i];
    const marketReturn = marketReturns[i];
    if (portfolioReturn !== undefined && marketReturn !== undefined) {
      covariance += (portfolioReturn - portfolioMean) * (marketReturn - marketMean);
    }
  }
  covariance /= portfolioReturns.length;

  // Calculate market variance
  const marketVariance =
    marketReturns.reduce((sum, r) => sum + Math.pow(r - marketMean, 2), 0) / marketReturns.length;

  if (marketVariance === 0) return 1;

  return covariance / marketVariance;
}

/**
 * Calculate Alpha (risk-adjusted excess return)
 * Alpha = Portfolio Return - (Risk Free Rate + Beta * (Market Return - Risk Free Rate))
 */
export function calculateAlpha(
  portfolioReturn: number,
  marketReturn: number,
  beta: number,
  riskFreeRate = 0,
  days: number
): number {
  // Annualize returns
  const annualizedPortfolioReturn = (portfolioReturn / 100) * (365 / days);
  const annualizedMarketReturn = (marketReturn / 100) * (365 / days);

  const expectedReturn = riskFreeRate + beta * (annualizedMarketReturn - riskFreeRate);
  return (annualizedPortfolioReturn - expectedReturn) * 100; // Return as percentage
}

/**
 * Calculate all advanced metrics
 */
export function calculateAdvancedMetrics(
  result: DeFiBacktestResult,
  benchmarkReturns?: number[]
): AdvancedMetrics {
  // Calculate returns from equity curve
  const returns: number[] = [];
  for (let i = 1; i < result.equityCurve.length; i++) {
    const prevPoint = result.equityCurve[i - 1];
    const currentPoint = result.equityCurve[i];
    if (prevPoint && currentPoint && prevPoint.equity > 0) {
      const dailyReturn = (currentPoint.equity - prevPoint.equity) / prevPoint.equity;
      returns.push(dailyReturn);
    }
  }

  // Calculate volatility
  const meanReturn =
    returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
  const variance =
    returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
      : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized

  // Calculate downside volatility
  const negativeReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
  const downsideVolatility = Math.sqrt(downsideVariance) * Math.sqrt(365) * 100;

  // Calculate days
  const startTime = result.startDate?.getTime() ?? Date.now();
  const endTime = result.endDate?.getTime() ?? Date.now();
  const days = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));

  // Calculate metrics
  const sortinoRatio = calculateSortinoRatio(returns);
  const calmarRatio = calculateCalmarRatio(
    result.metrics.totalReturn,
    result.metrics.maxDrawdown,
    days
  );

  // For beta and alpha, use benchmark if provided, otherwise use HODL
  let beta = 1;
  let alpha = 0;
  let informationRatio = 0;

  if (
    benchmarkReturns &&
    benchmarkReturns.length === returns.length &&
    benchmarkReturns.length > 0
  ) {
    beta = calculateBeta(returns, benchmarkReturns);
    const benchmarkFirst = benchmarkReturns[0];
    const benchmarkLast = benchmarkReturns[benchmarkReturns.length - 1];
    if (
      benchmarkFirst !== undefined &&
      benchmarkLast !== undefined &&
      benchmarkFirst !== 0 &&
      !isNaN(benchmarkFirst) &&
      !isNaN(benchmarkLast)
    ) {
      const benchmarkTotalReturn = ((benchmarkLast - benchmarkFirst) / benchmarkFirst) * 100;
      alpha = calculateAlpha(result.metrics.totalReturn, benchmarkTotalReturn, beta, 0, days);
    }
    informationRatio = calculateInformationRatio(returns, benchmarkReturns);
  }

  return {
    sortinoRatio,
    calmarRatio,
    informationRatio,
    beta,
    alpha,
    volatility,
    downsideVolatility,
  };
}
