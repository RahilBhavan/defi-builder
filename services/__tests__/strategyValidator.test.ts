import { describe, expect, it } from 'vitest';
import { BlockCategory, type LegoBlock, Protocol } from '../../types';
import { validateStrategy } from '../strategyValidator';

describe('validateStrategy', () => {
  it('should return invalid for empty blocks', () => {
    const result = validateStrategy([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it('should validate uniswap swap block with valid amount', () => {
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

    const result = validateStrategy(blocks);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return error for uniswap swap with invalid amount', () => {
    const blocks: LegoBlock[] = [
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
          amount: 0,
          slippage: 0.5,
        },
      },
    ];

    const result = validateStrategy(blocks);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('Amount');
  });

  it('should validate price trigger block with valid target price', () => {
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

    const result = validateStrategy(blocks);
    expect(result.valid).toBe(true);
  });

  it('should return error for price trigger without target price', () => {
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
          condition: '>=',
        },
      },
    ];

    const result = validateStrategy(blocks);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('Target Price');
  });
});
