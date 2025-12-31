import { describe, expect, it } from 'vitest';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock } from '../../types';
import { exportBlocks, importBlocks } from '../../services/strategyStorage';
import { validateStrategy } from '../../services/strategyValidator';

describe('Strategy Import/Export', () => {
  const mockBlocks: LegoBlock[] = [
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

  it('should export strategy to JSON', () => {
    const json = exportBlocks(mockBlocks);
    expect(json).toBeTruthy();
    expect(typeof json).toBe('string');
  });

  it('should export valid JSON', () => {
    const json = exportBlocks(mockBlocks);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should import strategy from JSON', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    expect(imported).toHaveLength(2);
  });

  it('should preserve all block properties after import/export', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    
    // IDs are regenerated, but other properties should be preserved
    expect(imported[0]?.id).toBeDefined();
    expect(imported[0]?.type).toBe('price_trigger');
    expect(imported[0]?.params.asset).toBe('ETH');
    
    expect(imported[1]?.id).toBeDefined();
    expect(imported[1]?.type).toBe('uniswap_swap');
    expect(imported[1]?.params.amount).toBe(1.0);
  });

  it('should maintain block order after import/export', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    
    expect(imported[0]?.category).toBe(BlockCategory.ENTRY);
    expect(imported[1]?.category).toBe(BlockCategory.PROTOCOL);
  });

  it('should validate imported strategy', () => {
    const json = exportBlocks(mockBlocks);
    const imported = importBlocks(json);
    const result = validateStrategy(imported);
    
    expect(result.valid).toBe(true);
  });

  it('should throw error for invalid JSON', () => {
    expect(() => importBlocks('invalid json')).toThrow(/Failed to import blocks/i);
  });

  it('should throw error for empty JSON', () => {
    expect(() => importBlocks('')).toThrow(/Failed to import blocks/i);
  });
});

