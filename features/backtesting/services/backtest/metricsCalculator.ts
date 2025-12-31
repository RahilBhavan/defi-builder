/**
 * Metrics calculation for backtest results
 */

import type { PortfolioManager, Trade } from './portfolio';

export interface CalculatedMetrics {
  sharpeRatio: number;
  totalReturn: number;
  maxDrawdown: number;
  winTrades: number;
  totalTrades: number;
  totalGasSpent: number;
  totalFeesSpent: number;
  averageReturn: number;
  volatility: number;
  winRate: number;
}

/**
 * Calculate Sharpe ratio from returns
 * Sharpe = (Mean Return - Risk Free Rate) / Standard Deviation of Returns
 */
function calculateSharpeRatio(returns: number[], riskFreeRate = 0): number {
  if (returns.length === 0) return 0;

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualize (assuming daily returns)
  const annualizedReturn = meanReturn * 365;
  const annualizedStdDev = stdDev * Math.sqrt(365);

  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculate maximum drawdown from equity curve
 */
function calculateMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = equityCurve[0];

  for (let i = 1; i < equityCurve.length; i++) {
    const current = equityCurve[i];

    if (current > peak) {
      peak = current;
    } else {
      const drawdown = ((peak - current) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown;
}

/**
 * Calculate win rate from trades
 */
function calculateWinRate(trades: Trade[]): { winTrades: number; totalTrades: number } {
  // Only count swap trades for win/loss
  const swapTrades = trades.filter(
    (t) => t.type === 'swap' || t.type === 'entry' || t.type === 'exit'
  );

  if (swapTrades.length < 2) {
    return { winTrades: 0, totalTrades: swapTrades.length };
  }

  let winCount = 0;
  let tradePairs = 0;

  // Pair entry and exit trades
  for (let i = 0; i < swapTrades.length - 1; i++) {
    const entry = swapTrades[i];
    const exit = swapTrades[i + 1];

    if (entry.type === 'entry' || entry.type === 'swap') {
      if (exit.type === 'exit' || exit.type === 'swap') {
        tradePairs++;

        // Calculate P&L
        const entryValue = entry.inputAmount * entry.price;
        const exitValue = exit.outputAmount
          ? exit.outputAmount * exit.price
          : entry.inputAmount * exit.price;

        if (exitValue > entryValue) {
          winCount++;
        }
      }
    }
  }

  return {
    winTrades: winCount,
    totalTrades: tradePairs || swapTrades.length,
  };
}

/**
 * Calculate all metrics from portfolio and equity curve
 */
export function calculateMetrics(
  portfolio: PortfolioManager,
  initialCapital: number,
  equityCurve: number[]
): CalculatedMetrics {
  const trades = portfolio.getTrades();
  const totalGasSpent = portfolio.getTotalGasSpent();
  const totalFeesSpent = portfolio.getTotalFeesSpent();

  // Calculate returns from equity curve
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prevEquity = equityCurve[i - 1];
    const currentEquity = equityCurve[i];
    if (prevEquity > 0) {
      const dailyReturn = (currentEquity - prevEquity) / prevEquity;
      returns.push(dailyReturn);
    }
  }

  // Calculate metrics
  const finalEquity = equityCurve[equityCurve.length - 1] || initialCapital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const sharpeRatio = calculateSharpeRatio(returns);
  const { winTrades, totalTrades } = calculateWinRate(trades);
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

  // Average return and volatility
  const averageReturn =
    returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;

  const variance =
    returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length
      : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized volatility in %

  return {
    sharpeRatio,
    totalReturn,
    maxDrawdown,
    winTrades,
    totalTrades,
    totalGasSpent,
    totalFeesSpent,
    averageReturn: averageReturn * 100,
    volatility,
    winRate,
  };
}
