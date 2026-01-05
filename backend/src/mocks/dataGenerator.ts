/**
 * Mock Data Generator for DeFi Builder
 * Generates realistic blockchain and DeFi data
 */

import type {
  BacktestData,
  DataGeneratorSchema,
  PoolData,
  PriceData,
  TransactionData,
} from './types';

interface PriceHistory {
  token: string;
  prices: Array<{ timestamp: number; price: number }>;
}

export class MockDataGenerator {
  private priceHistory: Map<string, PriceHistory> = new Map();
  private baseTokens = ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
  private defiTokens = ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'SUSHI'];

  constructor() {
    this.initializePriceHistory();
  }

  private initializePriceHistory(): void {
    // Initialize with realistic base prices
    const basePrices: Record<string, number> = {
      ETH: 2000,
      WETH: 2000,
      USDC: 1,
      USDT: 1,
      DAI: 1,
      WBTC: 42000,
      UNI: 6,
      AAVE: 90,
      COMP: 50,
      MKR: 1500,
      SNX: 2.5,
      CRV: 0.8,
      SUSHI: 1.2,
    };

    const now = Date.now();

    for (const [token, basePrice] of Object.entries(basePrices)) {
      const history: PriceHistory = {
        token,
        prices: [],
      };

      // Generate 24 hours of historical data (1-minute candles)
      for (let i = 1440; i >= 0; i--) {
        const timestamp = now - i * 60 * 1000;
        const volatility = token === 'ETH' ? 0.02 : 0.05;
        const randomWalk = this.generateRandomWalk(volatility);
        const price = basePrice * randomWalk;

        history.prices.push({ timestamp, price });
      }

      this.priceHistory.set(token, history);
    }
  }

  private generateRandomWalk(volatility: number): number {
    // Geometric Brownian Motion for realistic price movement
    const dt = 1 / (365 * 24 * 60); // 1 minute time step
    const drift = 0; // No drift for mock data
    const randomShock = this.normalRandom() * Math.sqrt(dt);

    return Math.exp(drift * dt + volatility * randomShock);
  }

  private normalRandom(): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  public generate(schema: DataGeneratorSchema | string): any {
    if (typeof schema === 'string') {
      return this.generateByType(schema);
    }

    switch (schema.type) {
      case 'object':
        return this.generateObject(schema);
      case 'array':
        return this.generateArray(schema);
      case 'string':
        return this.generateString(schema);
      case 'number':
        return this.generateNumber(schema);
      case 'boolean':
        return this.generateBoolean();
      default:
        return null;
    }
  }

  private generateByType(type: string): any {
    switch (type) {
      case 'price':
        return this.generatePriceData();
      case 'pool':
        return this.generatePoolData();
      case 'backtest':
        return this.generateBacktestData();
      case 'transaction':
        return this.generateTransactionData();
      case 'address':
        return this.generateAddress();
      case 'hash':
        return this.generateHash();
      case 'token':
        return this.generateTokenData();
      default:
        return null;
    }
  }

  private generateObject(schema: DataGeneratorSchema): any {
    const obj: any = {};

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        obj[key] = this.generate(propSchema);
      }
    }

    return obj;
  }

  private generateArray(schema: DataGeneratorSchema): any[] {
    const count = schema.count || Math.floor(Math.random() * 10) + 1;
    const items: any[] = [];

    if (schema.items) {
      for (let i = 0; i < count; i++) {
        items.push(this.generate(schema.items));
      }
    }

    return items;
  }

  private generateString(schema: DataGeneratorSchema): string {
    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    if (schema.format) {
      return this.generateFormattedString(schema.format);
    }

    if (schema.generator) {
      return this.generateByType(schema.generator) as string;
    }

    const minLength = schema.minLength || 5;
    const maxLength = schema.maxLength || 20;
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

    return Array.from({ length }, () =>
      String.fromCharCode(97 + Math.floor(Math.random() * 26))
    ).join('');
  }

  private generateNumber(schema: DataGeneratorSchema): number {
    const min = schema.min ?? 0;
    const max = schema.max ?? 100;

    return Math.random() * (max - min) + min;
  }

  private generateBoolean(): boolean {
    return Math.random() > 0.5;
  }

  private generateFormattedString(format: string): string {
    switch (format) {
      case 'address':
        return this.generateAddress();
      case 'hash':
        return this.generateHash();
      case 'uuid':
        return this.generateUUID();
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'datetime':
        return new Date().toISOString();
      default:
        return '';
    }
  }

  public generatePriceData(token?: string): PriceData {
    const selectedToken = token || this.randomToken();
    const history = this.priceHistory.get(selectedToken);

    if (!history) {
      throw new Error(`No price history for token: ${selectedToken}`);
    }

    const latestPrice = history.prices[history.prices.length - 1];
    const price24hAgo = history.prices[history.prices.length - 1440] || latestPrice;

    const change24h = ((latestPrice.price - price24hAgo.price) / price24hAgo.price) * 100;

    return {
      token: selectedToken,
      price: latestPrice.price,
      timestamp: latestPrice.timestamp,
      change24h: Number.parseFloat(change24h.toFixed(2)),
      volume24h: this.generateVolume(latestPrice.price),
      marketCap: this.generateMarketCap(selectedToken, latestPrice.price),
    };
  }

  public generatePoolData(token0?: string, token1?: string): PoolData {
    const t0 = token0 || this.randomToken();
    const t1 = token1 || this.randomToken(t0);

    const price0 = this.getCurrentPrice(t0);
    const price1 = this.getCurrentPrice(t1);

    // Generate realistic pool reserves
    const tvl = Math.random() * 10000000 + 100000; // $100k to $10M
    const value0 = tvl / 2;
    const value1 = tvl / 2;

    const reserve0 = value0 / price0;
    const reserve1 = value1 / price1;

    // Calculate total supply using x*y=k
    const k = reserve0 * reserve1;
    const totalSupply = Math.sqrt(k);

    // Generate APY based on pool size and volatility
    const baseApy = 5 + Math.random() * 15; // 5-20% base APY
    const volatilityBonus = this.calculateVolatilityBonus(t0, t1);
    const apy = baseApy + volatilityBonus;

    return {
      address: this.generateAddress(),
      token0: t0,
      token1: t1,
      reserve0: reserve0.toFixed(18),
      reserve1: reserve1.toFixed(18),
      totalSupply: totalSupply.toFixed(18),
      fee: 0.003, // 0.3% fee (Uniswap v2 standard)
      apy: Number.parseFloat(apy.toFixed(2)),
      tvl: Number.parseFloat(tvl.toFixed(2)),
    };
  }

  private calculateVolatilityBonus(token0: string, token1: string): number {
    // Higher volatility pairs = higher APY
    const isStablePair = this.isStableToken(token0) && this.isStableToken(token1);
    if (isStablePair) return 0;

    const hasStable = this.isStableToken(token0) || this.isStableToken(token1);
    if (hasStable) return Math.random() * 10; // 0-10% bonus

    return Math.random() * 30; // 0-30% bonus for volatile pairs
  }

  private isStableToken(token: string): boolean {
    return ['USDC', 'USDT', 'DAI'].includes(token);
  }

  public generateBacktestData(strategyId?: string): BacktestData {
    const id = strategyId || `strategy_${Math.random().toString(36).substr(2, 9)}`;
    const tradeCount = Math.floor(Math.random() * 100) + 20;

    const trades: BacktestData['trades'] = [];
    const equity: BacktestData['equity'] = [];

    let currentEquity = 10000; // Start with $10k
    let totalPnL = 0;
    let winningTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let maxEquity = currentEquity;
    let maxDrawdown = 0;

    const startTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    for (let i = 0; i < tradeCount; i++) {
      const timestamp = startTime + (i * (30 * 24 * 60 * 60 * 1000)) / tradeCount;
      const token = this.randomToken();
      const price = this.getCurrentPrice(token);

      // Simulate trade outcome (60% win rate)
      const isWin = Math.random() < 0.6;
      const pnlPercent = isWin
        ? Math.random() * 5 + 1 // 1-6% gain
        : -(Math.random() * 3 + 0.5); // 0.5-3.5% loss

      const amount = currentEquity * (Math.random() * 0.3 + 0.1); // Use 10-40% of equity
      const pnl = amount * (pnlPercent / 100);

      if (pnl > 0) {
        winningTrades++;
        grossProfit += pnl;
      } else {
        grossLoss += Math.abs(pnl);
      }

      totalPnL += pnl;
      currentEquity += pnl;

      // Track max drawdown
      if (currentEquity > maxEquity) {
        maxEquity = currentEquity;
      }
      const drawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      trades.push({
        timestamp,
        type: i % 2 === 0 ? 'buy' : 'sell',
        token,
        amount: amount / price,
        price,
        pnl: Number.parseFloat(pnl.toFixed(2)),
      });

      equity.push({
        timestamp,
        value: Number.parseFloat(currentEquity.toFixed(2)),
      });
    }

    const totalReturn = ((currentEquity - 10000) / 10000) * 100;
    const winRate = (winningTrades / tradeCount) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Sharpe ratio calculation (simplified)
    const returns = equity.map((e, i) =>
      i > 0 ? (e.value - equity[i - 1].value) / equity[i - 1].value : 0
    );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      strategyId: id,
      metrics: {
        totalReturn: Number.parseFloat(totalReturn.toFixed(2)),
        sharpeRatio: Number.parseFloat(sharpeRatio.toFixed(2)),
        maxDrawdown: Number.parseFloat(maxDrawdown.toFixed(2)),
        winRate: Number.parseFloat(winRate.toFixed(2)),
        profitFactor: Number.parseFloat(profitFactor.toFixed(2)),
      },
      trades,
      equity,
    };
  }

  public generateTransactionData(status?: TransactionData['status']): TransactionData {
    const txStatus =
      status || (['pending', 'confirmed', 'failed'] as const)[Math.floor(Math.random() * 3)];

    return {
      hash: this.generateHash(),
      from: this.generateAddress(),
      to: this.generateAddress(),
      value: (Math.random() * 10).toFixed(18),
      gas: String(Math.floor(Math.random() * 200000) + 21000),
      gasPrice: (Math.random() * 100 + 20).toFixed(9), // 20-120 Gwei
      nonce: Math.floor(Math.random() * 1000),
      status: txStatus,
      timestamp: Date.now(),
      blockNumber:
        txStatus === 'confirmed' ? Math.floor(Math.random() * 1000000) + 15000000 : undefined,
    };
  }

  private generateTokenData(): any {
    const token = this.randomToken();
    return {
      symbol: token,
      name: this.getTokenName(token),
      decimals: 18,
      address: this.generateAddress(),
      totalSupply: (Math.random() * 1000000000).toFixed(18),
    };
  }

  private getTokenName(symbol: string): string {
    const names: Record<string, string> = {
      ETH: 'Ethereum',
      WETH: 'Wrapped Ether',
      USDC: 'USD Coin',
      USDT: 'Tether USD',
      DAI: 'Dai Stablecoin',
      WBTC: 'Wrapped Bitcoin',
      UNI: 'Uniswap',
      AAVE: 'Aave',
      COMP: 'Compound',
      MKR: 'Maker',
      SNX: 'Synthetix',
      CRV: 'Curve DAO',
      SUSHI: 'SushiSwap',
    };
    return names[symbol] || symbol;
  }

  private generateAddress(): string {
    return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(
      ''
    )}`;
  }

  private generateHash(): string {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
      ''
    )}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private randomToken(exclude?: string): string {
    const allTokens = [...this.baseTokens, ...this.defiTokens];
    const availableTokens = exclude ? allTokens.filter((t) => t !== exclude) : allTokens;

    return availableTokens[Math.floor(Math.random() * availableTokens.length)];
  }

  private getCurrentPrice(token: string): number {
    const history = this.priceHistory.get(token);
    if (!history) return 1;

    const latest = history.prices[history.prices.length - 1];
    return latest.price;
  }

  private generateVolume(price: number): number {
    // Volume correlates with price (higher priced assets have lower volume)
    const baseVolume = 1000000; // $1M base
    const multiplier = Math.random() * 10 + 1; // 1-11x multiplier
    return Number.parseFloat(((baseVolume * multiplier) / Math.sqrt(price)).toFixed(2));
  }

  private generateMarketCap(token: string, price: number): number {
    // Realistic market caps
    const marketCaps: Record<string, number> = {
      ETH: 240000000000, // $240B
      WETH: 240000000000,
      USDC: 25000000000, // $25B
      USDT: 95000000000, // $95B
      DAI: 5000000000, // $5B
      WBTC: 8000000000, // $8B
      UNI: 4000000000,
      AAVE: 1500000000,
      COMP: 500000000,
      MKR: 1400000000,
      SNX: 500000000,
      CRV: 400000000,
      SUSHI: 200000000,
    };

    return Number.parseFloat((marketCaps[token] || 100000000).toFixed(2));
  }

  /**
   * Update price with new data point (maintains history)
   */
  public updatePrice(token: string, newPrice: number): void {
    const history = this.priceHistory.get(token);
    if (!history) return;

    history.prices.push({
      timestamp: Date.now(),
      price: newPrice,
    });

    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    history.prices = history.prices.filter((p) => p.timestamp > cutoff);
  }

  /**
   * Simulate market crash scenario
   */
  public simulateMarketCrash(severity = 0.3): void {
    for (const [token, history] of this.priceHistory) {
      if (!this.isStableToken(token)) {
        const latest = history.prices[history.prices.length - 1];
        const crashPrice = latest.price * (1 - severity);
        this.updatePrice(token, crashPrice);
      }
    }
  }
}
