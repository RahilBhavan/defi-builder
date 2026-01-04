/**
 * Portfolio tracking service
 * Tracks portfolio state from executed strategies and backtests
 */

import { logger } from '../lib/monitoring/logger';
import type { Trade } from './backtest/portfolio';
import type { DeFiBacktestResult } from './defiBacktestEngine';

export interface PortfolioSnapshot {
  id: string;
  timestamp: number;
  holdings: Map<string, number>; // token -> amount
  totalEquity: number;
  strategyId?: string;
  strategyName?: string;
}

export interface PortfolioTransaction {
  id: string;
  timestamp: number;
  type: 'SWAP' | 'SUPPLY' | 'BORROW' | 'WITHDRAW' | 'REPAY' | 'HARVEST';
  description: string;
  amount: string;
  token: string;
  status: 'Confirmed' | 'Pending' | 'Failed';
  strategyId?: string;
}

class PortfolioTracker {
  private snapshots: PortfolioSnapshot[] = [];
  private transactions: PortfolioTransaction[] = [];
  private currentHoldings: Map<string, number> = new Map();

  /**
   * Record a paper trading result and update portfolio
   */
  recordPaperTradingResult(
    result: DeFiBacktestResult,
    sessionId: string,
    strategyId?: string,
    strategyName?: string
  ): void {
    // Paper trading results are treated similarly to backtest results
    // but marked with sessionId for tracking
    this.recordBacktestResult(result, strategyId || sessionId, strategyName);
  }

  /**
   * Record a backtest result and update portfolio
   */
  recordBacktestResult(
    result: DeFiBacktestResult,
    strategyId?: string,
    strategyName?: string
  ): void {
    // Start with initial capital (assume USDC)
    const holdings = new Map<string, number>();
    holdings.set('USDC', result.initialCapital);

    // Process trades to calculate final holdings
    for (const trade of result.trades) {
      if (trade.type === 'swap') {
        // Update holdings based on swap
        const inputAmount = holdings.get(trade.inputToken) || 0;
        holdings.set(trade.inputToken, Math.max(0, inputAmount - trade.inputAmount));

        if (trade.outputToken && trade.outputAmount !== undefined) {
          const outputAmount = holdings.get(trade.outputToken) || 0;
          holdings.set(trade.outputToken, outputAmount + trade.outputAmount);
        }
      } else if (trade.type === 'supply') {
        const current = holdings.get(trade.token ?? trade.inputToken) || 0;
        holdings.set(
          trade.token ?? trade.inputToken,
          Math.max(0, current - (trade.amount ?? trade.inputAmount))
        );
      } else if (trade.type === 'withdraw') {
        const tokenKey = trade.token ?? trade.inputToken;
        const current = holdings.get(tokenKey) || 0;
        holdings.set(tokenKey, current + (trade.amount ?? trade.inputAmount));
      }
    }

    // Remove zero balances
    for (const [token, amount] of Array.from(holdings.entries())) {
      if (amount < 0.0001) {
        holdings.delete(token);
      }
    }

    let totalValue = result.initialCapital;

    // Calculate total equity from final equity curve
    if (result.equityCurve.length > 0) {
      const lastPoint = result.equityCurve[result.equityCurve.length - 1];
      if (lastPoint) {
        totalValue = lastPoint.equity;
      }
    }

    // Create snapshot
    const snapshot: PortfolioSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      holdings,
      totalEquity: totalValue,
      strategyId,
      strategyName,
    };

    this.snapshots.push(snapshot);
    this.currentHoldings = new Map(holdings);

    // Convert trades to transactions
    for (const trade of result.trades) {
      const transaction = this.tradeToTransaction(trade, strategyId);
      if (transaction) {
        this.transactions.push(transaction);
      }
    }

    // Persist to localStorage
    this.persist();
  }

  /**
   * Convert a trade to a transaction
   */
  private tradeToTransaction(trade: Trade, strategyId?: string): PortfolioTransaction | null {
    let type: PortfolioTransaction['type'] | null = null;
    let description = '';
    let amount = '';
    let token = '';

    switch (trade.type) {
      case 'swap':
        type = 'SWAP';
        description = `${trade.inputToken} → ${trade.outputToken ?? 'unknown'}`;
        amount = `${trade.inputAmount} ${trade.inputToken}`;
        token = trade.inputToken;
        break;
      case 'supply':
        type = 'SUPPLY';
        description = `Supply ${trade.token ?? trade.inputToken} to Aave`;
        amount = `${trade.amount ?? trade.inputAmount} ${trade.token ?? trade.inputToken}`;
        token = trade.token ?? trade.inputToken;
        break;
      case 'withdraw':
        type = 'WITHDRAW';
        description = `Withdraw ${trade.token ?? trade.inputToken} from Aave`;
        amount = `${trade.amount ?? trade.inputAmount} ${trade.token ?? trade.inputToken}`;
        token = trade.token ?? trade.inputToken;
        break;
      default:
        return null;
    }

    return {
      id: `tx-${Date.now()}-${Math.random()}`,
      timestamp: trade.timestamp,
      type,
      description,
      amount,
      token,
      status: 'Confirmed',
      strategyId,
    };
  }

  /**
   * Get current portfolio holdings
   */
  getCurrentHoldings(): Map<string, number> {
    return new Map(this.currentHoldings);
  }

  /**
   * Get all transactions
   */
  getTransactions(limit?: number): PortfolioTransaction[] {
    const sorted = [...this.transactions].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): PortfolioSnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): PortfolioSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all portfolio data
   */
  clear(): void {
    this.snapshots = [];
    this.transactions = [];
    this.currentHoldings.clear();
    this.persist();
  }

  /**
   * Persist to localStorage
   */
  private persist(): void {
    try {
      const data = {
        snapshots: this.snapshots.map((s) => ({
          ...s,
          holdings: Array.from(s.holdings.entries()),
        })),
        transactions: this.transactions,
        currentHoldings: Array.from(this.currentHoldings.entries()),
      };
      localStorage.setItem('defi-builder-portfolio', JSON.stringify(data));
    } catch (error) {
      logger.error(
        'Error persisting portfolio data',
        error instanceof Error ? error : new Error(String(error)),
        'PortfolioTracker'
      );
    }
  }

  /**
   * Load from localStorage
   */
  load(): void {
    try {
      const stored = localStorage.getItem('defi-builder-portfolio');
      if (!stored) return;

      interface StoredSnapshot {
        id: string;
        timestamp: number;
        holdings: Array<[string, number]>;
        totalEquity: number;
        strategyId?: string;
        strategyName?: string;
      }

      interface StoredData {
        snapshots?: StoredSnapshot[];
        transactions?: PortfolioTransaction[];
        currentHoldings?: Array<[string, number]>;
      }

      const data = JSON.parse(stored) as StoredData;
      this.snapshots = (data.snapshots || []).map((s) => ({
        ...s,
        holdings: new Map(s.holdings || []),
      }));
      this.transactions = data.transactions || [];
      this.currentHoldings = new Map(data.currentHoldings || []);
    } catch (error) {
      logger.error(
        'Error loading portfolio data',
        error instanceof Error ? error : new Error(String(error)),
        'PortfolioTracker'
      );
    }
  }
}

// Singleton instance
export const portfolioTracker = new PortfolioTracker();

// Load on initialization
if (typeof window !== 'undefined') {
  portfolioTracker.load();
}
