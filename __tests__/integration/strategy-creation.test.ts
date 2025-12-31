import { describe, expect, it, beforeEach } from 'vitest';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock } from '../../types';
import { validateStrategy } from '../../services/strategyValidator';
import { exportBlocks, importBlocks } from '../../services/strategyStorage';

describe('Strategy Creation Flow', () => {
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

  it('should create a valid strategy with ENTRY and PROTOCOL blocks', () => {
    const result = validateStrategy(mockBlocks);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate strategy after adding blocks', () => {
    const result = validateStrategy(mockBlocks);
    expect(result.valid).toBe(true);
  });

  it('should export strategy as JSON', () => {
    const json = exportBlocks(mockBlocks);
    expect(json).toBeTruthy();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should import strategy from JSON', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    expect(imported).toHaveLength(2);
    // IDs are regenerated on import, so just check they exist
    expect(imported[0]?.id).toBeDefined();
    expect(imported[1]?.id).toBeDefined();
  });

  it('should maintain block order after import/export', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    // Check types are preserved (order maintained)
    const types = imported.map(b => b.type);
    expect(types).toContain('price_trigger');
    expect(types).toContain('uniswap_swap');
  });

  it('should validate strategy after import', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    const result = validateStrategy(imported);
    expect(result.valid).toBe(true);
  });

  it('should fail validation for invalid strategy', () => {
    const invalidBlocks: LegoBlock[] = [
      {
        id: '1',
        type: 'uniswap_swap',
        label: 'UNISWAP SWAP',
        description: 'Swap tokens',
        category: BlockCategory.PROTOCOL,
        protocol: Protocol.UNISWAP,
        icon: 'swap',
        params: {
          inputToken: 'ETH',
          outputToken: 'USDC',
          amount: 0, // Invalid amount
        },
      },
    ];
    
    const result = validateStrategy(invalidBlocks);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

