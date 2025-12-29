import { LegoBlock } from '../types';

export interface DeFiBacktestResult {
  metrics: {
    sharpeRatio: number;
    totalReturn: number;
    maxDrawdown: number;
    winTrades: number;
    totalTrades: number;
    totalGasSpent: number;
    totalFeesSpent: number;
  };
  equityCurve: Array<{ date: string; equity: number }>;
}

export interface BacktestConfig {
  blocks: LegoBlock[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  rebalanceInterval: number;
}

export async function runDeFiBacktest(config: BacktestConfig): Promise<DeFiBacktestResult> {
  // Simulation stub - returns semi-random results for UI testing
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

  const randomFactor = Math.random();
  
  return {
    metrics: {
      sharpeRatio: 1.2 + randomFactor,
      totalReturn: 10 + (randomFactor * 20),
      maxDrawdown: -5 - (randomFactor * 10),
      winTrades: Math.floor(50 + (randomFactor * 20)),
      totalTrades: 100,
      totalGasSpent: 0.05,
      totalFeesSpent: 0.1
    },
    equityCurve: []
  };
}
