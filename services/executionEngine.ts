import { LegoBlock } from '../types';
import { runDeFiBacktest, DeFiBacktestResult } from './defiBacktestEngine';

export const executeStrategy = async (blocks: LegoBlock[]): Promise<DeFiBacktestResult> => {
  // Run backtest with default config
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // 6 months back
  
  const result = await runDeFiBacktest({
    blocks,
    startDate,
    endDate,
    initialCapital: 10000,
    rebalanceInterval: 86400000, // 1 day in ms
  });
  
  return result;
};
