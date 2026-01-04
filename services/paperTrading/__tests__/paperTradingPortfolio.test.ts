/**
 * Unit tests for Paper Trading Portfolio Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PaperTradingPortfolioManager } from '../paperTradingPortfolio';

describe('PaperTradingPortfolioManager', () => {
  let portfolio: PaperTradingPortfolioManager;

  beforeEach(() => {
    portfolio = new PaperTradingPortfolioManager('test-session', 10000);
  });

  describe('constructor', () => {
    it('should initialize with initial capital', () => {
      const equityCurve = portfolio.getEquityCurve();
      expect(equityCurve.length).toBe(1);
      expect(equityCurve[0]?.equity).toBe(10000);
    });
  });

  describe('updateEquity', () => {
    it('should update equity curve with valid prices', () => {
      const prices = new Map<string, number>([
        ['USDC', 1.0],
        ['ETH', 2500],
      ]);

      portfolio.updateEquity(prices);
      const equityCurve = portfolio.getEquityCurve();

      expect(equityCurve.length).toBeGreaterThan(1);
      expect(equityCurve[equityCurve.length - 1]?.equity).toBeDefined();
    });

    it('should handle invalid equity values gracefully', () => {
      const prices = new Map<string, number>([['USDC', 1.0]]);
      
      // This should not throw
      portfolio.updateEquity(prices);
      const equityCurve = portfolio.getEquityCurve();
      
      expect(equityCurve.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCurrentEquity', () => {
    it('should return current equity based on prices', () => {
      const prices = new Map<string, number>([
        ['USDC', 1.0],
        ['ETH', 2500],
      ]);

      const equity = portfolio.getCurrentEquity(prices);
      expect(equity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEquityCurve', () => {
    it('should return equity curve array', () => {
      const equityCurve = portfolio.getEquityCurve();
      expect(Array.isArray(equityCurve)).toBe(true);
      expect(equityCurve.length).toBeGreaterThan(0);
    });

    it('should limit to 1000 points', () => {
      const prices = new Map<string, number>([['USDC', 1.0]]);
      
      // Add more than 1000 points
      for (let i = 0; i < 1500; i++) {
        portfolio.updateEquity(prices);
      }

      const equityCurve = portfolio.getEquityCurve();
      expect(equityCurve.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('generateResult', () => {
    it('should generate result compatible with backtest format', () => {
      const prices = new Map<string, number>([['USDC', 1.0]]);
      portfolio.updateEquity(prices);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const result = portfolio.generateResult(10000, startDate, endDate);

      expect(result.initialCapital).toBe(10000);
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
      expect(result.equityCurve).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
    });
  });
});

