/**
 * Paper Trading Portfolio Manager
 * Manages portfolio state for paper trading sessions separately from backtest portfolio
 */

import { logger } from '../../lib/monitoring/logger';
import { PortfolioManager, type Trade } from '../backtest/portfolio';
import type { DeFiBacktestResult } from '../defiBacktestEngine';

export class PaperTradingPortfolioManager {
  private portfolio: PortfolioManager;
  private sessionId: string;
  private equityCurve: Array<{ date: string; equity: number }> = [];
  private lastUpdateTime: Date;

  constructor(sessionId: string, initialCapital: number) {
    this.sessionId = sessionId;
    this.portfolio = new PortfolioManager(initialCapital);
    this.lastUpdateTime = new Date();

    // Initialize equity curve with starting point
    this.equityCurve.push({
      date: new Date().toISOString(),
      equity: initialCapital,
    });
  }

  /**
   * Get the underlying portfolio manager
   */
  getPortfolio(): PortfolioManager {
    return this.portfolio;
  }

  /**
   * Update equity curve with current portfolio value
   */
  updateEquity(prices: Map<string, number>): void {
    const equity = this.portfolio.calculateEquity(prices);
    const now = new Date();

    // Validate equity value
    if (isNaN(equity) || !isFinite(equity) || equity < 0) {
      logger.warn(
        `Invalid equity value for session ${this.sessionId}: ${equity}. Using previous value.`,
        'PaperTradingPortfolio'
      );
      return;
    }

    this.equityCurve.push({
      date: now.toISOString(),
      equity,
    });
    this.lastUpdateTime = now;

    // Keep only last 1000 points to avoid memory issues
    if (this.equityCurve.length > 1000) {
      this.equityCurve = this.equityCurve.slice(-1000);
    }
  }

  /**
   * Get current equity
   */
  getCurrentEquity(prices: Map<string, number>): number {
    return this.portfolio.calculateEquity(prices);
  }

  /**
   * Get equity curve
   */
  getEquityCurve(): Array<{ date: string; equity: number }> {
    return [...this.equityCurve];
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return this.portfolio.getTrades();
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  /**
   * Generate backtest result compatible format
   */
  generateResult(
    initialCapital: number,
    startDate: Date,
    endDate: Date
  ): Omit<DeFiBacktestResult, 'metrics'> {
    // Calculate metrics would be done by the engine using calculateMetrics
    return {
      equityCurve: this.getEquityCurve(),
      trades: this.getTrades(),
      startDate,
      endDate,
      initialCapital,
    };
  }
}
