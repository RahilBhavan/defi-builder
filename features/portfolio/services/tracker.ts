/**
 * Portfolio tracking service
 * Tracks portfolio state from executed strategies and backtests
 */

import type { Trade } from '../../../features/backtesting/services/backtest/portfolio';
import { logger } from '../../../lib/monitoring/logger';
import type { DeFiBacktestResult } from '../../../services/defiBacktestEngine';

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
    result.trades.forEach((trade: Trade) => {
      if (trade.type === 'swap') {
        // Update holdings based on swap
        const inputAmount = holdings.get(trade.inputToken) || 0;
        holdings.set(trade.inputToken, Math.max(0, inputAmount - trade.inputAmount));

        if (trade.outputToken && trade.outputAmount !== undefined) {
          const outputAmount = holdings.get(trade.outputToken) || 0;
          holdings.set(trade.outputToken, outputAmount + trade.outputAmount);
        }
      } else if (trade.type === 'supply') {
        const current = holdings.get(trade.inputToken) || 0;
        holdings.set(trade.inputToken, Math.max(0, current - trade.inputAmount));
      } else if (trade.type === 'withdraw') {
        const current = holdings.get(trade.inputToken) || 0;
        holdings.set(trade.inputToken, current + (trade.outputAmount ?? trade.inputAmount));
      }
    });

    // Remove zero balances
    Array.from(holdings.entries()).forEach(([token, amount]) => {
      if (amount < 0.0001) {
        holdings.delete(token);
      }
    });

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
    result.trades.forEach((trade: Trade) => {
      const transaction = this.tradeToTransaction(trade, strategyId);
      if (transaction) {
        this.transactions.push(transaction);
      }
    });

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
        description = `Supply ${trade.inputToken} to Aave`;
        amount = `${trade.inputAmount} ${trade.inputToken}`;
        token = trade.inputToken;
        break;
      case 'withdraw':
        type = 'WITHDRAW';
        description = `Withdraw ${trade.inputToken} from Aave`;
        amount = `${trade.outputAmount ?? trade.inputAmount} ${trade.inputToken}`;
        token = trade.inputToken;
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
    const latest = this.snapshots[this.snapshots.length - 1];
    return latest ?? null;
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

      const data = JSON.parse(stored);
      this.snapshots = (data.snapshots || []).map((s: any) => ({
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
