/**
 * Portfolio tracking service
 * Tracks portfolio state from executed strategies and backtests
 */

import type { DeFiBacktestResult } from './defiBacktestEngine';
import type { Trade } from './backtest/portfolio';

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
    result.trades.forEach((trade) => {
      if (trade.type === 'SWAP') {
        // Update holdings based on swap
        const inputAmount = holdings.get(trade.inputToken) || 0;
        holdings.set(trade.inputToken, Math.max(0, inputAmount - trade.inputAmount));

        const outputAmount = holdings.get(trade.outputToken) || 0;
        holdings.set(trade.outputToken, outputAmount + trade.outputAmount);
      } else if (trade.type === 'SUPPLY') {
        const current = holdings.get(trade.token) || 0;
        holdings.set(trade.token, Math.max(0, current - trade.amount));
      } else if (trade.type === 'WITHDRAW') {
        const current = holdings.get(trade.token) || 0;
        holdings.set(trade.token, current + trade.amount);
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
      totalValue = result.equityCurve[result.equityCurve.length - 1].equity;
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
    result.trades.forEach((trade) => {
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
  private tradeToTransaction(
    trade: Trade,
    strategyId?: string
  ): PortfolioTransaction | null {
    let type: PortfolioTransaction['type'] | null = null;
    let description = '';
    let amount = '';
    let token = '';

    switch (trade.type) {
      case 'SWAP':
        type = 'SWAP';
        description = `${trade.inputToken} → ${trade.outputToken}`;
        amount = `${trade.inputAmount} ${trade.inputToken}`;
        token = trade.inputToken;
        break;
      case 'SUPPLY':
        type = 'SUPPLY';
        description = `Supply ${trade.token} to Aave`;
        amount = `${trade.amount} ${trade.token}`;
        token = trade.token;
        break;
      case 'WITHDRAW':
        type = 'WITHDRAW';
        description = `Withdraw ${trade.token} from Aave`;
        amount = `${trade.amount} ${trade.token}`;
        token = trade.token;
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
    return this.snapshots[this.snapshots.length - 1];
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
      console.error('Error persisting portfolio data:', error);
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
      console.error('Error loading portfolio data:', error);
    }
  }
}

// Singleton instance
export const portfolioTracker = new PortfolioTracker();

// Load on initialization
if (typeof window !== 'undefined') {
  portfolioTracker.load();
}

