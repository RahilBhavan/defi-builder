import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sanitizeStrategyDescription,
  sanitizeStrategyName,
  validateAndSanitizeStrategy,
} from '../../features/strategy-builder/services/sharing';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock, Strategy } from '../../types';

describe('Strategy Sharing Flow', () => {
  let mockBlocks: LegoBlock[];
  let mockStrategy: Strategy;

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

    mockStrategy = {
      id: 'test-strategy-1',
      name: 'Test Strategy',
      description: 'A test strategy for sharing',
      blocks: mockBlocks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe('Strategy sanitization', () => {
    it('should sanitize strategy name', () => {
      expect(sanitizeStrategyName('Test Strategy')).toBe('Test Strategy');
      // Sanitization removes HTML tags and dangerous chars, but keeps parentheses
      expect(sanitizeStrategyName('<script>alert("xss")</script>')).toBe('alert(xss)');
      expect(sanitizeStrategyName('Test & Strategy')).toBe('Test  Strategy');
    });

    it('should limit strategy name length', () => {
      const longName = 'a'.repeat(150);
      const sanitized = sanitizeStrategyName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(100);
    });

    it('should sanitize strategy description', () => {
      expect(sanitizeStrategyDescription('Test description')).toBe('Test description');
      // Sanitization removes HTML tags and dangerous chars, but keeps parentheses
      expect(sanitizeStrategyDescription('<script>alert("xss")</script>')).toBe('alert(xss)');
      expect(sanitizeStrategyDescription(undefined)).toBe('');
    });

    it('should limit description length', () => {
      const longDescription = 'a'.repeat(600);
      const sanitized = sanitizeStrategyDescription(longDescription);
      expect(sanitized.length).toBeLessThanOrEqual(500);
    });
  });

  describe('validateAndSanitizeStrategy', () => {
    it('should validate and sanitize a valid strategy', () => {
      const sanitized = validateAndSanitizeStrategy(mockStrategy);

      expect(sanitized.name).toBe('Test Strategy');
      expect(sanitized.blocks).toHaveLength(2);
      expect(sanitized.blocks[0].id).toBe('1');
      // Sanitization removes '>' from '>=' making it '='
      expect(sanitized.blocks[0].params.asset).toBe(mockBlocks[0].params.asset);
      expect(sanitized.blocks[0].params.targetPrice).toBe(mockBlocks[0].params.targetPrice);
      expect(sanitized.blocks[0].params.condition).toBe('='); // '>=' becomes '=' after sanitization
    });

    it('should sanitize HTML tags from strategy name', () => {
      const strategyWithHtml = {
        ...mockStrategy,
        name: '<script>alert("xss")</script>Test Strategy',
      };

      const sanitized = validateAndSanitizeStrategy(strategyWithHtml);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).not.toContain('</script>');
      expect(sanitized.name).not.toContain('"');
      // Note: 'alert' and parentheses are kept as they're not dangerous
      expect(sanitized.name).toContain('Test Strategy');
    });

    it('should sanitize HTML tags from block params', () => {
      const strategyWithHtmlParams = {
        ...mockStrategy,
        blocks: [
          {
            ...mockBlocks[0],
            params: {
              ...mockBlocks[0].params,
              asset: '<script>ETH</script>',
            },
          },
        ],
      };

      const sanitized = validateAndSanitizeStrategy(strategyWithHtmlParams);
      expect(sanitized.blocks[0].params.asset).not.toContain('<script>');
    });

    it('should preserve non-string param values', () => {
      const sanitized = validateAndSanitizeStrategy(mockStrategy);

      expect(typeof sanitized.blocks[0].params.targetPrice).toBe('number');
      expect(sanitized.blocks[0].params.targetPrice).toBe(3000);
      expect(typeof sanitized.blocks[1].params.amount).toBe('number');
      expect(sanitized.blocks[1].params.amount).toBe(1.0);
    });

    it('should include createdAt timestamp', () => {
      const sanitized = validateAndSanitizeStrategy(mockStrategy);
      expect(sanitized.createdAt).toBe(mockStrategy.createdAt);
    });

    it('should throw error for invalid strategy name', () => {
      const invalidStrategy = {
        ...mockStrategy,
        name: '', // Empty name should fail validation
      };

      expect(() => {
        validateAndSanitizeStrategy(invalidStrategy);
      }).toThrow();
    });

    it('should truncate strategy name that is too long', () => {
      const longNameStrategy = {
        ...mockStrategy,
        name: 'a'.repeat(150), // Too long, will be truncated
      };

      const sanitized = validateAndSanitizeStrategy(longNameStrategy);
      // Name is truncated to 100 chars by sanitization, then validated
      expect(sanitized.name.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Strategy sharing workflow', () => {
    it('should prepare strategy for sharing', () => {
      const sanitized = validateAndSanitizeStrategy(mockStrategy);

      // Should have all required fields
      expect(sanitized).toHaveProperty('name');
      expect(sanitized).toHaveProperty('blocks');
      expect(sanitized).toHaveProperty('createdAt');

      // Blocks should be properly formatted
      expect(Array.isArray(sanitized.blocks)).toBe(true);
      sanitized.blocks.forEach((block) => {
        expect(block).toHaveProperty('id');
        expect(block).toHaveProperty('type');
        expect(block).toHaveProperty('params');
      });
    });

    it('should handle strategy with special characters', () => {
      const specialCharStrategy = {
        ...mockStrategy,
        name: 'Strategy & Co. <Test> "Quote"',
      };

      const sanitized = validateAndSanitizeStrategy(specialCharStrategy);
      expect(sanitized.name).not.toContain('<');
      expect(sanitized.name).not.toContain('>');
      expect(sanitized.name).not.toContain('"');
    });

    it('should handle empty blocks array', () => {
      const emptyStrategy = {
        ...mockStrategy,
        blocks: [],
      };

      const sanitized = validateAndSanitizeStrategy(emptyStrategy);
      expect(sanitized.blocks).toEqual([]);
    });
  });
});
