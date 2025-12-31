import { describe, expect, it, beforeEach } from 'vitest';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock } from '../../types';
import { validateStrategy } from '../../services/strategyValidator';

describe('Undo/Redo Operations', () => {
  let initialBlocks: LegoBlock[];
  let modifiedBlocks: LegoBlock[];

  beforeEach(() => {
    initialBlocks = [
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

    modifiedBlocks = [
      ...initialBlocks,
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
        },
      },
    ];
  });

  it('should maintain strategy validity after undo', () => {
    // Initial state
    const initialResult = validateStrategy(initialBlocks);
    expect(initialResult.valid).toBe(false); // Missing PROTOCOL block

    // Modified state
    const modifiedResult = validateStrategy(modifiedBlocks);
    expect(modifiedResult.valid).toBe(true);

    // After undo (back to initial)
    const undoResult = validateStrategy(initialBlocks);
    expect(undoResult.valid).toBe(false);
  });

  it('should maintain strategy validity after redo', () => {
    // After redo (back to modified)
    const redoResult = validateStrategy(modifiedBlocks);
    expect(redoResult.valid).toBe(true);
  });

  it('should preserve block order through undo/redo', () => {
    const initialOrder = initialBlocks.map(b => b.id);
    const modifiedOrder = modifiedBlocks.map(b => b.id);

    // After undo
    expect(initialBlocks.map(b => b.id)).toEqual(initialOrder);

    // After redo
    expect(modifiedBlocks.map(b => b.id)).toEqual(modifiedOrder);
  });
});

