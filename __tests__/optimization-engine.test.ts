import { describe, expect, it } from 'vitest';
import { optimizationEngine } from '../services/optimization';
import { BlockCategory, Protocol } from '../types';
import type { LegoBlock } from '../types';

describe('Optimization Engine', () => {
  it('should be instantiated', () => {
    expect(optimizationEngine).toBeDefined();
    expect(typeof optimizationEngine.optimize).toBe('function');
    expect(typeof optimizationEngine.stop).toBe('function');
    expect(typeof optimizationEngine.dispose).toBe('function');
  });

  it('should stop optimization', () => {
    expect(() => optimizationEngine.stop()).not.toThrow();
  });

  it('should handle empty blocks gracefully', async () => {
    const blocks: LegoBlock[] = [];
    const config = {
      algorithm: 'bayesian' as const,
      objectives: ['sharpeRatio', 'maxDrawdown'] as const,
      maxIterations: 5,
      parameters: [],
      backtestConfig: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        initialCapital: 10000,
        rebalanceInterval: 86400000,
      },
    };

    // Should not throw, but may return empty results
    await expect(optimizationEngine.optimize(blocks, config)).resolves.toBeDefined();
  });

  it('should handle basic optimization config', async () => {
    const blocks: LegoBlock[] = [
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
          targetPrice: 3000,
          condition: '>=',
        },
      },
    ];

    const config = {
      algorithm: 'bayesian' as const,
      objectives: ['sharpeRatio'] as const,
      maxIterations: 2, // Small number for quick test
      parameters: [],
      backtestConfig: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        initialCapital: 10000,
        rebalanceInterval: 86400000,
      },
    };

    // Should complete without throwing
    const result = await optimizationEngine.optimize(blocks, config);
    expect(result).toBeDefined();
    expect(result.config).toEqual(config);
    expect(result.solutions).toBeDefined();
    expect(Array.isArray(result.solutions)).toBe(true);
    expect(result.totalIterations).toBeGreaterThanOrEqual(0);
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });

  it('should call progress callback', async () => {
    const blocks: LegoBlock[] = [
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
          targetPrice: 3000,
          condition: '>=',
        },
      },
    ];

    const config = {
      algorithm: 'bayesian' as const,
      objectives: ['sharpeRatio'] as const,
      maxIterations: 2,
      parameters: [],
      backtestConfig: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        initialCapital: 10000,
        rebalanceInterval: 86400000,
      },
    };

    const progressUpdates: number[] = [];
    await optimizationEngine.optimize(blocks, config, (progress) => {
      progressUpdates.push(progress.iteration);
    });

    // Should have received at least some progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
