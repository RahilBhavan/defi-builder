import { beforeEach, describe, expect, it } from 'vitest';
import { validateStrategy } from '../../services/strategyValidator';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock } from '../../types';

describe('Optimization Workflow', () => {
  let mockBlocks: LegoBlock[];

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
          targetPrice: 3000,
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
  });

  it('should validate strategy before optimization', () => {
    const result = validateStrategy(mockBlocks);
    expect(result.valid).toBe(true);
  });

  it('should extract optimizable parameters from blocks', () => {
    // Find blocks with optimizable parameters
    const optimizableBlocks = mockBlocks.filter((block) => {
      return block.params.amount !== undefined || block.params.slippage !== undefined;
    });

    expect(optimizableBlocks.length).toBeGreaterThan(0);
  });

  it('should identify parameter ranges for optimization', () => {
    const swapBlock = mockBlocks.find((b) => b.type === 'uniswap_swap');
    expect(swapBlock).toBeDefined();
    expect(swapBlock?.params.amount).toBeDefined();
    expect(swapBlock?.params.slippage).toBeDefined();
  });

  it('should maintain strategy validity after parameter changes', () => {
    // Simulate parameter update
    const updatedBlocks = mockBlocks.map((block) => {
      if (block.type === 'uniswap_swap') {
        return {
          ...block,
          params: {
            ...block.params,
            amount: 2.0, // Updated amount
          },
        };
      }
      return block;
    });

    const result = validateStrategy(updatedBlocks);
    expect(result.valid).toBe(true);
  });
});
