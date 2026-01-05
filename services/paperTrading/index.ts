/**
 * Paper Trading Service - Main Export
 */

export { paperTradingEngine } from './paperTradingEngine';
export { PaperTradingPortfolioManager } from './paperTradingPortfolio';
export { paperTradingStorage } from './paperTradingStorage';
export type {
  PaperTradingConfig,
  PaperTradingResult,
  PaperTradingSession,
  PaperTradingStatusCallback,
  PaperTradingStatusUpdate,
  StoredPaperTradingData,
} from './types';
