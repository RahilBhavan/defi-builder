import { describe, expect, it, beforeEach } from 'vitest';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock } from '../../types';
import { runDeFiBacktest } from '../../services/defiBacktestEngine';
import type { BacktestConfig } from '../../services/defiBacktestEngine';

describe('Backtest Execution Flow', () => {
  let mockBlocks: LegoBlock[];
  let backtestConfig: BacktestConfig;

  beforeEach(() => {
    mockBlocks = [
      {
        id: '1',
        type: 'price_trigger',
        label: 'PRICE TRIGGER',
        description: 'Trigger on price',
        category: BlockCategory.ENTRY,
        protocol: Protocol.GENERIC,
        icon: 'trigger',
        params: {
          asset: 'ETH',
          targetPrice: 2000,
          condition: '>=',
        },
      },
      {
        id: '2',
        type: 'uniswap_swap',
        label: 'UNISWAP SWAP',
        description: 'Swap tokens',
        category: BlockCategory.PROTOCOL,
        protocol: Protocol.UNISWAP,
        icon: 'swap',
        params: {
          inputToken: 'ETH',
          outputToken: 'USDC',
          amount: 1.0,
          slippage: 0.5,
        },
      },
    ];

    backtestConfig = {
      blocks: mockBlocks,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      initialCapital: 10000,
      rebalanceInterval: 86400000, // 1 day
    };
  });

  it('should run backtest with valid configuration', async () => {
    const result = await runDeFiBacktest(backtestConfig);
    
    expect(result).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.equityCurve).toBeDefined();
    expect(result.trades).toBeDefined();
    expect(result.startDate).toEqual(backtestConfig.startDate);
    expect(result.endDate).toEqual(backtestConfig.endDate);
    expect(result.initialCapital).toBe(backtestConfig.initialCapital);
  });

  it('should calculate metrics correctly', async () => {
    const result = await runDeFiBacktest(backtestConfig);
    
    expect(result.metrics.sharpeRatio).toBeDefined();
    expect(result.metrics.totalReturn).toBeDefined();
    expect(result.metrics.maxDrawdown).toBeDefined();
    expect(result.metrics.totalTrades).toBeGreaterThanOrEqual(0);
  });

  it('should generate equity curve', async () => {
    const result = await runDeFiBacktest(backtestConfig);
    
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve[0]).toHaveProperty('date');
    expect(result.equityCurve[0]).toHaveProperty('equity');
  });

  it('should throw error for empty blocks', async () => {
    const invalidConfig: BacktestConfig = {
      ...backtestConfig,
      blocks: [],
    };
    
    await expect(runDeFiBacktest(invalidConfig)).rejects.toThrow();
  });

  it('should handle date range correctly', async () => {
    const result = await runDeFiBacktest(backtestConfig);
    
    expect(result.startDate.getTime()).toBeLessThanOrEqual(result.endDate.getTime());
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });
});

