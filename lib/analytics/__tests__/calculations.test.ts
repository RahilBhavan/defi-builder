/**
 * Analytics Calculations Tests
 * Tests for performance and risk metrics calculations
 */

import { describe, expect, it } from 'vitest';
import {
  type EquityPoint,
  type Trade,
  calculateBeta,
  calculateCVaR,
  calculateCalmarRatio,
  calculateCorrelation,
  calculateMaxDrawdown,
  calculatePerformanceMetrics,
  calculateProfitFactor,
  calculateRiskMetrics,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateVaR,
  calculateVolatility,
  calculateWinRate,
} from '../calculations';

describe('Performance Metrics', () => {
  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, 0.01];
      const sharpe = calculateSharpeRatio(returns);
      expect(sharpe).toBeGreaterThan(0);
      expect(typeof sharpe).toBe('number');
    });

    it('should handle empty returns', () => {
      expect(calculateSharpeRatio([])).toBe(0);
    });

    it('should handle zero volatility', () => {
      const returns = [0.01, 0.01, 0.01, 0.01];
      expect(calculateSharpeRatio(returns)).toBe(0);
    });
  });

  describe('calculateSortinoRatio', () => {
    it('should calculate Sortino ratio correctly', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, 0.01];
      const sortino = calculateSortinoRatio(returns);
      // Sortino can be 0 if no negative returns or if downside deviation is 0
      expect(typeof sortino).toBe('number');
      expect(Number.isFinite(sortino)).toBe(true);
    });

    it('should handle empty returns', () => {
      expect(calculateSortinoRatio([])).toBe(0);
    });

    it('should handle no negative returns', () => {
      const returns = [0.01, 0.02, 0.01, 0.03];
      expect(calculateSortinoRatio(returns)).toBe(0);
    });
  });

  describe('calculateCalmarRatio', () => {
    it('should calculate Calmar ratio correctly', () => {
      const annualReturn = 0.15;
      const maxDrawdown = 0.1;
      const calmar = calculateCalmarRatio(annualReturn, maxDrawdown);
      // Calmar = annualReturn / abs(maxDrawdown)
      // 0.15 / 0.1 = 1.5
      expect(calmar).toBeCloseTo(1.5, 2);
    });

    it('should handle zero drawdown', () => {
      expect(calculateCalmarRatio(0.15, 0)).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate maximum drawdown', () => {
      const equityPoints: EquityPoint[] = [
        { timestamp: 0, equity: 1000 },
        { timestamp: 1, equity: 1200 },
        { timestamp: 2, equity: 800 },
        { timestamp: 3, equity: 1100 },
        { timestamp: 4, equity: 900 },
      ];

      const drawdown = calculateMaxDrawdown(equityPoints);
      expect(drawdown).toBeGreaterThan(0);
      expect(drawdown).toBeLessThanOrEqual(1);
    });

    it('should handle empty equity points', () => {
      expect(calculateMaxDrawdown([])).toBe(0);
    });

    it('should handle single equity point', () => {
      expect(calculateMaxDrawdown([{ timestamp: 0, equity: 1000 }])).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, 0.01];
      const volatility = calculateVolatility(returns);
      expect(volatility).toBeGreaterThan(0);
      expect(typeof volatility).toBe('number');
    });

    it('should handle empty returns', () => {
      expect(calculateVolatility([])).toBe(0);
    });
  });
});

describe('Risk Metrics', () => {
  describe('calculateVaR', () => {
    it('should calculate Value at Risk', () => {
      const returns = [-0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.05];
      const var95 = calculateVaR(returns, 0.95);
      expect(var95).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty returns', () => {
      expect(calculateVaR([], 0.95)).toBe(0);
    });
  });

  describe('calculateCVaR', () => {
    it('should calculate Conditional VaR', () => {
      const returns = [-0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.05];
      const cvar95 = calculateCVaR(returns, 0.95);
      expect(cvar95).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty returns', () => {
      expect(calculateCVaR([], 0.95)).toBe(0);
    });
  });

  describe('calculateBeta', () => {
    it('should calculate beta', () => {
      const strategyReturns = [0.01, 0.02, -0.01, 0.03];
      const marketReturns = [0.005, 0.015, -0.005, 0.025];
      const beta = calculateBeta(strategyReturns, marketReturns);
      expect(typeof beta).toBe('number');
    });

    it('should handle mismatched lengths', () => {
      expect(calculateBeta([0.01], [0.01, 0.02])).toBe(0);
    });

    it('should handle empty returns', () => {
      expect(calculateBeta([], [])).toBe(0);
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation', () => {
      const strategyReturns = [0.01, 0.02, -0.01, 0.03];
      const marketReturns = [0.005, 0.015, -0.005, 0.025];
      const correlation = calculateCorrelation(strategyReturns, marketReturns);
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should handle mismatched lengths', () => {
      expect(calculateCorrelation([0.01], [0.01, 0.02])).toBe(0);
    });
  });
});

describe('Trade Metrics', () => {
  describe('calculateWinRate', () => {
    it('should calculate win rate', () => {
      const trades: Trade[] = [
        { timestamp: 0, pnl: 100, return: 0.1 },
        { timestamp: 1, pnl: -50, return: -0.05 },
        { timestamp: 2, pnl: 200, return: 0.2 },
        { timestamp: 3, pnl: -30, return: -0.03 },
      ];

      const winRate = calculateWinRate(trades);
      expect(winRate).toBe(0.5); // 2 wins out of 4
    });

    it('should handle empty trades', () => {
      expect(calculateWinRate([])).toBe(0);
    });
  });

  describe('calculateProfitFactor', () => {
    it('should calculate profit factor', () => {
      const trades: Trade[] = [
        { timestamp: 0, pnl: 100, return: 0.1 },
        { timestamp: 1, pnl: -50, return: -0.05 },
        { timestamp: 2, pnl: 200, return: 0.2 },
        { timestamp: 3, pnl: -30, return: -0.03 },
      ];

      const profitFactor = calculateProfitFactor(trades);
      expect(profitFactor).toBe(300 / 80); // Total profit / Total loss
    });

    it('should handle empty trades', () => {
      expect(calculateProfitFactor([])).toBe(0);
    });

    it('should handle no losses', () => {
      const trades: Trade[] = [
        { timestamp: 0, pnl: 100, return: 0.1 },
        { timestamp: 1, pnl: 200, return: 0.2 },
      ];

      const profitFactor = calculateProfitFactor(trades);
      expect(profitFactor).toBe(Number.POSITIVE_INFINITY);
    });
  });
});

describe('Comprehensive Metrics', () => {
  describe('calculatePerformanceMetrics', () => {
    it('should calculate all performance metrics', () => {
      const equityPoints: EquityPoint[] = [
        { timestamp: 0, equity: 1000 },
        { timestamp: 1, equity: 1100 },
        { timestamp: 2, equity: 1050 },
        { timestamp: 3, equity: 1200 },
      ];

      const trades: Trade[] = [
        { timestamp: 1, pnl: 100, return: 0.1 },
        { timestamp: 2, pnl: -50, return: -0.05 },
        { timestamp: 3, pnl: 150, return: 0.15 },
      ];

      const metrics = calculatePerformanceMetrics(equityPoints, trades);

      expect(metrics.totalReturn).toBe(200);
      expect(metrics.totalReturnPercent).toBe(20);
      expect(metrics.winRate).toBeGreaterThan(0);
      expect(metrics.profitFactor).toBeGreaterThan(0);
      expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty data', () => {
      const metrics = calculatePerformanceMetrics([], []);
      expect(metrics.totalReturn).toBe(0);
      expect(metrics.totalReturnPercent).toBe(0);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate all risk metrics', () => {
      const returns = [-0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.05];
      const marketReturns = [-0.03, -0.02, -0.01, 0.01, 0.015, 0.02, 0.03];

      const metrics = calculateRiskMetrics(returns, marketReturns);

      expect(metrics.var95).toBeGreaterThanOrEqual(0);
      expect(metrics.var99).toBeGreaterThanOrEqual(0);
      expect(metrics.cvar95).toBeGreaterThanOrEqual(0);
      expect(metrics.cvar99).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.beta).toBe('number');
      expect(metrics.correlation).toBeGreaterThanOrEqual(-1);
      expect(metrics.correlation).toBeLessThanOrEqual(1);
    });

    it('should handle empty returns', () => {
      const metrics = calculateRiskMetrics([], []);
      expect(metrics.var95).toBe(0);
      expect(metrics.beta).toBe(0);
    });
  });
});
