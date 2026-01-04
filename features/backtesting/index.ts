/**
 * Backtesting Feature
 *
 * All components, services, and types related to strategy backtesting
 */

// Components
export { BacktestModal } from './components/BacktestModal';

// Services
export { runDeFiBacktest } from './services/engine';
export type { DeFiBacktestResult, BacktestConfig } from './services/engine';
