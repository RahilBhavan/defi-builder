/**
 * Paper Trading Engine
 * Manages paper trading sessions and executes strategies continuously using real-time prices
 */

import { logger } from '../../lib/monitoring/logger';
import type { LegoBlock } from '../../types';
import { type ExecutionContext, executeBlockSequence } from '../backtest/blockExecutor';
import { calculateMetrics } from '../backtest/metricsCalculator';
import { type PriceUpdate, priceFeedService } from '../priceFeed';
import { PaperTradingPortfolioManager } from './paperTradingPortfolio';
import { paperTradingStorage } from './paperTradingStorage';
import type {
  PaperTradingConfig,
  PaperTradingResult,
  PaperTradingSession,
  PaperTradingStatusCallback,
} from './types';

/**
 * Extract unique tokens from blocks
 */
function extractTokens(blocks: LegoBlock[]): string[] {
  const tokens = new Set<string>();

  for (const block of blocks) {
    if (block.params.inputToken) {
      tokens.add(String(block.params.inputToken));
    }
    if (block.params.outputToken) {
      tokens.add(String(block.params.outputToken));
    }
    if (block.params.asset) {
      tokens.add(String(block.params.asset));
    }
  }

  return Array.from(tokens);
}

/**
 * Apply Aave interest to positions over time
 */
function applyAaveInterest(
  portfolio: PaperTradingPortfolioManager,
  _prices: Map<string, number>,
  daysElapsed: number
): void {
  const portfolioManager = portfolio.getPortfolio();
  const positions = portfolioManager.getPositions();
  const aaveAPY = 0.05; // 5% APY

  for (const position of positions) {
    if (position.protocol === 'Aave' && position.type === 'supply') {
      const dailyRate = aaveAPY / 365;
      const interest = position.amount * dailyRate * daysElapsed;
      position.amount += interest;
    }
  }
}

export class PaperTradingEngine {
  private sessions: Map<string, PaperTradingSession> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private priceSubscriptions: Map<string, Array<() => void>> = new Map();
  private statusCallbacks: Set<PaperTradingStatusCallback> = new Set();

  constructor() {
    // Load sessions from storage on initialization
    this.loadSessions();
  }

  /**
   * Load sessions from storage
   */
  private loadSessions(): void {
    const storedSessions = paperTradingStorage.load();
    for (const session of storedSessions) {
      this.sessions.set(session.id, session);
      // Restart running sessions
      if (session.status === 'running') {
        this.startSession(session.id);
      }
    }
  }

  /**
   * Save sessions to storage
   */
  private saveSessions(): void {
    paperTradingStorage.save(Array.from(this.sessions.values()));
  }

  /**
   * Create a new paper trading session
   */
  createSession(config: PaperTradingConfig): PaperTradingSession {
    const sessionId = `paper-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const portfolio = new PaperTradingPortfolioManager(sessionId, config.initialCapital);

    const session: PaperTradingSession = {
      id: sessionId,
      config,
      status: 'stopped',
      startTime: now,
      results: {
        sessionId,
        isLive: true,
        lastUpdateTime: now,
        metrics: {
          sharpeRatio: 0,
          totalReturn: 0,
          maxDrawdown: 0,
          winTrades: 0,
          totalTrades: 0,
          totalGasSpent: 0,
          totalFeesSpent: 0,
        },
        equityCurve: portfolio.getEquityCurve(),
        trades: [],
        startDate: config.startDate,
        endDate: now,
        initialCapital: config.initialCapital,
      },
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return session;
  }

  /**
   * Start a paper trading session
   */
  startSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status === 'running') {
      logger.warn(`Session ${sessionId} is already running`, 'PaperTradingEngine');
      return;
    }

    session.status = 'running';
    session.startTime = new Date();
    session.nextExecutionTime = new Date(Date.now() + session.config.rebalanceInterval);

    // Create portfolio manager
    const portfolio = new PaperTradingPortfolioManager(sessionId, session.config.initialCapital);

    // Subscribe to price updates for required tokens
    const tokens = extractTokens(session.config.blocks);
    const unsubscribers: Array<() => void> = [];

    for (const token of tokens) {
      const unsubscribe = priceFeedService.subscribe(token, (update: PriceUpdate) => {
        this.handlePriceUpdate(sessionId, update);
      });
      unsubscribers.push(unsubscribe);
    }

    this.priceSubscriptions.set(sessionId, unsubscribers);

    // Set up execution interval
    const interval = setInterval(() => {
      this.executeSession(sessionId);
    }, session.config.rebalanceInterval);

    this.intervals.set(sessionId, interval);

    // Execute immediately
    this.executeSession(sessionId);

    this.saveSessions();
    this.notifyStatusUpdate(sessionId);
  }

  /**
   * Pause a paper trading session
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'running') {
      return;
    }

    session.status = 'paused';

    // Clear interval
    const interval = this.intervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(sessionId);
    }

    // Unsubscribe from price updates
    const unsubscribers = this.priceSubscriptions.get(sessionId);
    if (unsubscribers) {
      unsubscribers.forEach((unsub) => unsub());
      this.priceSubscriptions.delete(sessionId);
    }

    this.saveSessions();
    this.notifyStatusUpdate(sessionId);
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      return;
    }

    this.startSession(sessionId);
  }

  /**
   * Stop a paper trading session
   */
  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'stopped';

    // Clear interval
    const interval = this.intervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(sessionId);
    }

    // Unsubscribe from price updates
    const unsubscribers = this.priceSubscriptions.get(sessionId);
    if (unsubscribers) {
      unsubscribers.forEach((unsub) => unsub());
      this.priceSubscriptions.delete(sessionId);
    }

    // Finalize results
    this.finalizeSession(sessionId);

    this.saveSessions();
    this.notifyStatusUpdate(sessionId);
  }

  /**
   * Execute a session (run strategy with current prices)
   */
  private async executeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') {
      return;
    }

    try {
      const portfolio = new PaperTradingPortfolioManager(sessionId, session.config.initialCapital);

      // Get current prices for all tokens
      const tokens = extractTokens(session.config.blocks);
      const currentPrices = new Map<string, number>();

      for (const token of tokens) {
        const price = priceFeedService.getPrice(token);
        if (price !== undefined && price > 0) {
          currentPrices.set(token, price);
        } else {
          logger.warn(
            `No price available for ${token} in session ${sessionId}`,
            'PaperTradingEngine'
          );
        }
      }

      if (currentPrices.size === 0) {
        logger.warn(
          `No prices available for session ${sessionId}, skipping execution`,
          'PaperTradingEngine'
        );
        return;
      }

      // Apply interest to Aave positions
      const now = Date.now();
      const lastExecution = session.lastExecutionTime?.getTime() || session.startTime.getTime();
      const daysElapsed = (now - lastExecution) / (1000 * 60 * 60 * 24);
      if (daysElapsed > 0) {
        applyAaveInterest(portfolio, currentPrices, daysElapsed);
      }

      // Create execution context
      const context: ExecutionContext = {
        timestamp: now,
        prices: currentPrices,
        portfolio: portfolio.getPortfolio(),
        previousResults: new Map(),
      };

      // Execute blocks
      try {
        executeBlockSequence(session.config.blocks, context);
      } catch (error) {
        logger.warn(
          `Error executing blocks in session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
          'PaperTradingEngine'
        );
      }

      // Update equity curve
      portfolio.updateEquity(currentPrices);

      // Update session
      session.lastExecutionTime = new Date();
      session.nextExecutionTime = new Date(now + session.config.rebalanceInterval);

      // Update results
      const equityCurve = portfolio.getEquityCurve();
      const trades = portfolio.getTrades();
      const equityValues = equityCurve.map((p) => p.equity);
      const metrics = calculateMetrics(
        portfolio.getPortfolio(),
        session.config.initialCapital,
        equityValues
      );

      session.results = {
        sessionId,
        isLive: true,
        lastUpdateTime: new Date(),
        metrics: {
          sharpeRatio: metrics.sharpeRatio,
          totalReturn: metrics.totalReturn,
          maxDrawdown: metrics.maxDrawdown,
          winTrades: metrics.winTrades,
          totalTrades: metrics.totalTrades,
          totalGasSpent: metrics.totalGasSpent,
          totalFeesSpent: metrics.totalFeesSpent,
        },
        equityCurve,
        trades,
        startDate: session.config.startDate,
        endDate: new Date(),
        initialCapital: session.config.initialCapital,
      };

      this.saveSessions();
      this.notifyStatusUpdate(sessionId);
    } catch (error) {
      logger.error(
        `Error executing session ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
        'PaperTradingEngine'
      );
    }
  }

  /**
   * Handle price update
   */
  private handlePriceUpdate(sessionId: string, _update: PriceUpdate): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') {
      return;
    }

    // Update equity curve with new price
    const portfolio = new PaperTradingPortfolioManager(sessionId, session.config.initialCapital);
    const prices = new Map<string, number>();
    const tokens = extractTokens(session.config.blocks);

    for (const token of tokens) {
      const price = priceFeedService.getPrice(token);
      if (price !== undefined) {
        prices.set(token, price);
      }
    }

    if (prices.size > 0) {
      portfolio.updateEquity(prices);
      this.notifyStatusUpdate(sessionId);
    }
  }

  /**
   * Finalize session results
   */
  private finalizeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const portfolio = new PaperTradingPortfolioManager(sessionId, session.config.initialCapital);
    const prices = new Map<string, number>();
    const tokens = extractTokens(session.config.blocks);

    for (const token of tokens) {
      const price = priceFeedService.getPrice(token);
      if (price !== undefined) {
        prices.set(token, price);
      }
    }

    if (prices.size > 0) {
      portfolio.updateEquity(prices);
    }

    const equityCurve = portfolio.getEquityCurve();
    const trades = portfolio.getTrades();
    const equityValues = equityCurve.map((p) => p.equity);
    const metrics = calculateMetrics(
      portfolio.getPortfolio(),
      session.config.initialCapital,
      equityValues
    );

    session.results = {
      ...session.results,
      isLive: false,
      lastUpdateTime: new Date(),
      metrics: {
        sharpeRatio: metrics.sharpeRatio,
        totalReturn: metrics.totalReturn,
        maxDrawdown: metrics.maxDrawdown,
        winTrades: metrics.winTrades,
        totalTrades: metrics.totalTrades,
        totalGasSpent: metrics.totalGasSpent,
        totalFeesSpent: metrics.totalFeesSpent,
      },
      equityCurve,
      trades,
      endDate: new Date(),
    };

    this.saveSessions();
  }

  /**
   * Get a session
   */
  getSession(sessionId: string): PaperTradingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): PaperTradingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.stopSession(sessionId);
    this.sessions.delete(sessionId);
    paperTradingStorage.removeSession(sessionId);
    this.notifyStatusUpdate(sessionId);
  }

  /**
   * Subscribe to status updates
   */
  onStatusUpdate(callback: PaperTradingStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Notify status update
   */
  private notifyStatusUpdate(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const portfolio = new PaperTradingPortfolioManager(sessionId, session.config.initialCapital);
    const prices = new Map<string, number>();
    const tokens = extractTokens(session.config.blocks);

    for (const token of tokens) {
      const price = priceFeedService.getPrice(token);
      if (price !== undefined) {
        prices.set(token, price);
      }
    }

    const equity =
      prices.size > 0
        ? portfolio.getCurrentEquity(prices)
        : session.results.equityCurve[session.results.equityCurve.length - 1]?.equity ||
          session.config.initialCapital;

    const update = {
      sessionId,
      status: session.status,
      equity,
      lastExecutionTime: session.lastExecutionTime,
      nextExecutionTime: session.nextExecutionTime,
    };

    this.statusCallbacks.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        logger.error(
          'Error in status update callback',
          error instanceof Error ? error : new Error(String(error)),
          'PaperTradingEngine'
        );
      }
    });
  }
}

// Singleton instance
export const paperTradingEngine = new PaperTradingEngine();
