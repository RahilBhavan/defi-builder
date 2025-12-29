/**
 * Portfolio state management for backtesting
 */

export interface Portfolio {
  balances: Map<string, number>; // token -> amount
  positions: Map<string, Position>; // positionId -> position
  totalEquity: number; // Total portfolio value in USD
}

export interface Position {
  id: string;
  type: 'supply' | 'borrow' | 'liquidity' | 'swap';
  asset: string;
  amount: number;
  entryPrice: number;
  entryTimestamp: number;
  protocol?: string;
}

export interface Trade {
  id: string;
  timestamp: number;
  type: 'entry' | 'exit' | 'swap' | 'supply' | 'withdraw';
  inputToken: string;
  outputToken?: string;
  inputAmount: number;
  outputAmount?: number;
  price: number;
  slippage?: number;
  fees: number;
  gasCost: number;
}

export class PortfolioManager {
  private portfolio: Portfolio;
  private trades: Trade[] = [];
  private tradeCounter = 0;

  constructor(initialCapital: number) {
    this.portfolio = {
      balances: new Map([['USDC', initialCapital]]), // Start with USDC
      positions: new Map(),
      totalEquity: initialCapital,
    };
  }

  /**
   * Get current portfolio
   */
  getPortfolio(): Portfolio {
    return { ...this.portfolio };
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Get balance for a token
   */
  getBalance(token: string): number {
    return this.portfolio.balances.get(token) || 0;
  }

  /**
   * Set balance for a token
   */
  setBalance(token: string, amount: number): void {
    this.portfolio.balances.set(token, amount);
  }

  /**
   * Add to balance
   */
  addBalance(token: string, amount: number): void {
    const current = this.getBalance(token);
    this.setBalance(token, current + amount);
  }

  /**
   * Subtract from balance
   */
  subtractBalance(token: string, amount: number): void {
    const current = this.getBalance(token);
    if (current < amount) {
      throw new Error(`Insufficient balance: ${token}. Have ${current}, need ${amount}`);
    }
    this.setBalance(token, current - amount);
  }

  /**
   * Record a trade
   */
  recordTrade(trade: Omit<Trade, 'id'>): Trade {
    const fullTrade: Trade = {
      ...trade,
      id: `trade-${++this.tradeCounter}-${Date.now()}`,
    };
    this.trades.push(fullTrade);
    return fullTrade;
  }

  /**
   * Add a position
   */
  addPosition(position: Omit<Position, 'id'>): Position {
    const fullPosition: Position = {
      ...position,
      id: `position-${Date.now()}-${Math.random()}`,
    };
    this.portfolio.positions.set(fullPosition.id, fullPosition);
    return fullPosition;
  }

  /**
   * Remove a position
   */
  removePosition(positionId: string): Position | undefined {
    const position = this.portfolio.positions.get(positionId);
    if (position) {
      this.portfolio.positions.delete(positionId);
    }
    return position;
  }

  /**
   * Get all positions
   */
  getPositions(): Position[] {
    return Array.from(this.portfolio.positions.values());
  }

  /**
   * Calculate total equity in USD using current prices
   */
  calculateEquity(tokenPrices: Map<string, number>): number {
    let total = 0;

    // Add token balances
    for (const [token, amount] of this.portfolio.balances.entries()) {
      const price = tokenPrices.get(token) || 0;
      total += amount * price;
    }

    // Add position values
    for (const position of this.portfolio.positions.values()) {
      const price = tokenPrices.get(position.asset) || 0;
      total += position.amount * price;
    }

    this.portfolio.totalEquity = total;
    return total;
  }

  /**
   * Get total gas spent
   */
  getTotalGasSpent(): number {
    return this.trades.reduce((sum, trade) => sum + trade.gasCost, 0);
  }

  /**
   * Get total fees spent
   */
  getTotalFeesSpent(): number {
    return this.trades.reduce((sum, trade) => sum + trade.fees, 0);
  }
}

