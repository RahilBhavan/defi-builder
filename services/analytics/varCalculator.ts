/**
 * Enhanced VaR Calculator
 * Provides multiple VaR calculation methods and confidence levels
 */

export interface VaRResult {
  historical: number; // Historical VaR
  parametric: number; // Parametric (variance-covariance) VaR
  monteCarlo: number; // Monte Carlo VaR
  confidenceLevel: number;
}

/**
 * Calculate Value at Risk using historical method
 */
export function calculateHistoricalVaR(
  returns: number[],
  confidenceLevel = 0.95
): number {
  if (returns.length === 0) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const percentileIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  const varValue = sortedReturns[percentileIndex] ?? 0;

  return Math.abs(varValue) * 100; // Return as positive percentage
}

/**
 * Calculate Value at Risk using parametric method (variance-covariance)
 * Assumes returns follow a normal distribution
 */
export function calculateParametricVaR(
  returns: number[],
  confidenceLevel = 0.95
): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for confidence level
  const zScores: Record<number, number> = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326,
  };
  const zScore = zScores[confidenceLevel] || 1.645;

  // VaR = mean - (z-score * stdDev)
  const varValue = meanReturn - (zScore * stdDev);

  return Math.abs(varValue) * 100; // Return as positive percentage
}

/**
 * Calculate Value at Risk using Monte Carlo method
 * Simulates returns based on historical distribution
 */
export function calculateMonteCarloVaR(
  returns: number[],
  confidenceLevel = 0.95,
  simulations = 10000
): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Generate random returns based on normal distribution
  const simulatedReturns: number[] = [];
  for (let i = 0; i < simulations; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const simulatedReturn = meanReturn + z * stdDev;
    simulatedReturns.push(simulatedReturn);
  }

  // Sort and find percentile
  const sortedReturns = simulatedReturns.sort((a, b) => a - b);
  const percentileIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  const varValue = sortedReturns[percentileIndex] ?? 0;

  return Math.abs(varValue) * 100; // Return as positive percentage
}

/**
 * Calculate VaR using all methods
 */
export function calculateVaR(
  returns: number[],
  confidenceLevel = 0.95
): VaRResult {
  return {
    historical: calculateHistoricalVaR(returns, confidenceLevel),
    parametric: calculateParametricVaR(returns, confidenceLevel),
    monteCarlo: calculateMonteCarloVaR(returns, confidenceLevel),
    confidenceLevel,
  };
}

/**
 * Calculate VaR at multiple confidence levels
 */
export function calculateVaRMultipleLevels(
  returns: number[]
): {
  var90: VaRResult;
  var95: VaRResult;
  var99: VaRResult;
} {
  return {
    var90: calculateVaR(returns, 0.90),
    var95: calculateVaR(returns, 0.95),
    var99: calculateVaR(returns, 0.99),
  };
}

