/**
 * Analytics Calculations
 * Performance metrics, risk metrics, and attribution analysis
 */

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
}

export interface RiskMetrics {
  var95: number; // Value at Risk (95% confidence)
  var99: number; // Value at Risk (99% confidence)
  cvar95: number; // Conditional VaR (95% confidence)
  cvar99: number; // Conditional VaR (99% confidence)
  beta: number; // Beta vs market
  correlation: number; // Correlation with market
}

export interface Trade {
  timestamp: number;
  pnl: number;
  return: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
}

/**
 * Calculate Sharpe Ratio
 * Sharpe = (Return - RiskFreeRate) / Volatility
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate / 252; // Daily risk-free rate

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (excessReturn / stdDev) * Math.sqrt(252); // Annualized
}

/**
 * Calculate Sortino Ratio
 * Sortino = (Return - RiskFreeRate) / DownsideDeviation
 */
export function calculateSortinoRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate / 252;

  // Only negative returns for downside deviation
  const negativeReturns = returns.filter((r) => r < 0);
  if (negativeReturns.length === 0) return 0;

  const avgNegative = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
  const downsideVariance =
    negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgNegative, 2), 0) /
    negativeReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);

  if (downsideDev === 0) return 0;

  return (excessReturn / downsideDev) * Math.sqrt(252); // Annualized
}

/**
 * Calculate Calmar Ratio
 * Calmar = AnnualReturn / MaxDrawdown
 */
export function calculateCalmarRatio(annualReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return 0;
  return annualReturn / Math.abs(maxDrawdown);
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(equityPoints: EquityPoint[]): number {
  if (equityPoints.length === 0) return 0;

  let maxEquity = equityPoints[0].equity;
  let maxDrawdown = 0;

  for (const point of equityPoints) {
    if (point.equity > maxEquity) {
      maxEquity = point.equity;
    }
    const drawdown = (maxEquity - point.equity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate Volatility (Standard Deviation)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252); // Annualized
}

/**
 * Calculate Value at Risk (VaR)
 */
export function calculateVaR(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return Math.abs(sorted[index] || 0);
}

/**
 * Calculate Conditional VaR (CVaR)
 */
export function calculateCVaR(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const varValue = calculateVaR(returns, confidence);
  const tailReturns = sorted.filter((r) => r <= -varValue);

  if (tailReturns.length === 0) return varValue;

  const avgTail = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  return Math.abs(avgTail);
}

/**
 * Calculate Win Rate
 */
export function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  return winningTrades / trades.length;
}

/**
 * Calculate Profit Factor
 * Profit Factor = Total Profit / Total Loss
 */
export function calculateProfitFactor(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  const totalProfit = trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));

  if (totalLoss === 0) return totalProfit > 0 ? Number.POSITIVE_INFINITY : 0;

  return totalProfit / totalLoss;
}

/**
 * Calculate Beta
 * Beta = Covariance(Strategy, Market) / Variance(Market)
 */
export function calculateBeta(strategyReturns: number[], marketReturns: number[]): number {
  if (strategyReturns.length === 0 || marketReturns.length === 0) return 0;
  if (strategyReturns.length !== marketReturns.length) return 0;

  const strategyAvg = strategyReturns.reduce((sum, r) => sum + r, 0) / strategyReturns.length;
  const marketAvg = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < strategyReturns.length; i++) {
    covariance += (strategyReturns[i] - strategyAvg) * (marketReturns[i] - marketAvg);
    marketVariance += Math.pow(marketReturns[i] - marketAvg, 2);
  }

  covariance /= strategyReturns.length;
  marketVariance /= marketReturns.length;

  if (marketVariance === 0) return 0;

  return covariance / marketVariance;
}

/**
 * Calculate Correlation
 */
export function calculateCorrelation(strategyReturns: number[], marketReturns: number[]): number {
  if (strategyReturns.length === 0 || marketReturns.length === 0) return 0;
  if (strategyReturns.length !== marketReturns.length) return 0;

  const strategyAvg = strategyReturns.reduce((sum, r) => sum + r, 0) / strategyReturns.length;
  const marketAvg = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;

  let covariance = 0;
  let strategyVariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < strategyReturns.length; i++) {
    const strategyDiff = strategyReturns[i] - strategyAvg;
    const marketDiff = marketReturns[i] - marketAvg;

    covariance += strategyDiff * marketDiff;
    strategyVariance += Math.pow(strategyDiff, 2);
    marketVariance += Math.pow(marketDiff, 2);
  }

  covariance /= strategyReturns.length;
  strategyVariance /= strategyReturns.length;
  marketVariance /= strategyReturns.length;

  const strategyStdDev = Math.sqrt(strategyVariance);
  const marketStdDev = Math.sqrt(marketVariance);

  if (strategyStdDev === 0 || marketStdDev === 0) return 0;

  return covariance / (strategyStdDev * marketStdDev);
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  equityPoints: EquityPoint[],
  trades: Trade[]
): PerformanceMetrics {
  if (equityPoints.length === 0) {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      winRate: 0,
      profitFactor: 0,
    };
  }

  const initialEquity = equityPoints[0].equity;
  const finalEquity = equityPoints[equityPoints.length - 1].equity;
  const totalReturn = finalEquity - initialEquity;
  const totalReturnPercent = initialEquity > 0 ? (totalReturn / initialEquity) * 100 : 0;

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < equityPoints.length; i++) {
    const prevEquity = equityPoints[i - 1].equity;
    if (prevEquity > 0) {
      returns.push((equityPoints[i].equity - prevEquity) / prevEquity);
    }
  }

  const maxDrawdown = calculateMaxDrawdown(equityPoints);
  const annualReturn = totalReturnPercent / (equityPoints.length / 252); // Approximate

  return {
    totalReturn,
    totalReturnPercent,
    sharpeRatio: calculateSharpeRatio(returns),
    sortinoRatio: calculateSortinoRatio(returns),
    calmarRatio: calculateCalmarRatio(annualReturn, maxDrawdown),
    maxDrawdown,
    volatility: calculateVolatility(returns),
    winRate: calculateWinRate(trades),
    profitFactor: calculateProfitFactor(trades),
  };
}

/**
 * Calculate risk metrics
 */
export function calculateRiskMetrics(returns: number[], marketReturns?: number[]): RiskMetrics {
  const var95 = calculateVaR(returns, 0.95);
  const var99 = calculateVaR(returns, 0.99);
  const cvar95 = calculateCVaR(returns, 0.95);
  const cvar99 = calculateCVaR(returns, 0.99);

  let beta = 0;
  let correlation = 0;

  if (marketReturns && marketReturns.length === returns.length) {
    beta = calculateBeta(returns, marketReturns);
    correlation = calculateCorrelation(returns, marketReturns);
  }

  return {
    var95,
    var99,
    cvar95,
    cvar99,
    beta,
    correlation,
  };
}
