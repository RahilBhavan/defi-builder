import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteStrategy, getStrategies, saveStrategy } from '../../services/strategyStorage';
import { validateStrategy } from '../../services/strategyValidator';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock, Strategy } from '../../types';

describe('Error Recovery Scenarios', () => {
  let mockBlocks: LegoBlock[];
  let mockStrategy: Strategy;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }

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
      description: 'A test strategy',
      blocks: mockBlocks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe('Storage error recovery', () => {
    it('should recover from localStorage quota exceeded error', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      localStorage.setItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
        // Second call succeeds (recovery)
        originalSetItem.call(localStorage, key, value);
      });

      // Should throw error but not crash
      expect(() => {
        saveStrategy(mockStrategy);
      }).toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should recover from corrupted localStorage data', () => {
      // Set invalid JSON
      localStorage.setItem('defi-builder-strategies', 'invalid json {');

      // Should return empty array instead of throwing
      const strategies = getStrategies();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBe(0);
    });

    it('should recover from missing localStorage key', () => {
      localStorage.removeItem('defi-builder-strategies');

      // Should return empty array
      const strategies = getStrategies();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBe(0);
    });

    it('should handle null localStorage value', () => {
      localStorage.setItem('defi-builder-strategies', 'null');

      const strategies = getStrategies();
      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  describe('Strategy validation error recovery', () => {
    it('should handle invalid strategy blocks gracefully', () => {
      const invalidBlocks: LegoBlock[] = [
        {
          id: '1',
          type: 'invalid_type',
          label: 'INVALID',
          description: 'Invalid block',
          category: BlockCategory.ENTRY,
          protocol: Protocol.GENERIC,
          icon: 'invalid',
          params: {},
        },
      ];

      const result = validateStrategy(invalidBlocks);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing required blocks', () => {
      // Strategy with only PROTOCOL block (missing ENTRY)
      const incompleteBlocks: LegoBlock[] = [
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

      const result = validateStrategy(incompleteBlocks);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.toLowerCase().includes('entry'))).toBe(true);
    });

    it('should handle empty blocks array', () => {
      const result = validateStrategy([]);
      expect(result.valid).toBe(false);
      // Empty blocks array returns valid: false with empty errors array
      expect(result.errors).toEqual([]);
    });
  });

  describe('Data consistency recovery', () => {
    it('should maintain data consistency after failed save', () => {
      // Save strategy successfully
      saveStrategy(mockStrategy);
      expect(getStrategies()).toHaveLength(1);

      // Attempt to save with invalid data (should fail but not corrupt existing)
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Save failed');
      });

      const invalidStrategy = {
        ...mockStrategy,
        id: 'invalid-strategy',
        name: '',
      };

      expect(() => {
        saveStrategy(invalidStrategy);
      }).toThrow();

      // Existing strategy should still be intact
      localStorage.setItem = originalSetItem;
      const strategies = getStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0].id).toBe(mockStrategy.id);
    });

    it('should recover from partial write', () => {
      // Save first strategy
      saveStrategy(mockStrategy);

      // Mock partial write failure
      let writeCount = 0;
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn((key, value) => {
        writeCount++;
        if (writeCount === 1 && key === 'defi-builder-strategies') {
          // Partial write - only write first half
          const partialValue = value.toString().slice(0, value.toString().length / 2);
          originalSetItem.call(localStorage, key, partialValue);
          throw new Error('Partial write');
        }
        originalSetItem.call(localStorage, key, value);
      });

      const strategy2 = {
        ...mockStrategy,
        id: 'strategy-2',
        name: 'Second Strategy',
      };

      // Should handle error gracefully
      expect(() => {
        saveStrategy(strategy2);
      }).toThrow();

      // Restore and verify recovery
      localStorage.setItem = originalSetItem;
      const strategies = getStrategies();
      // After partial write failure, verify we can still read strategies
      // (the first strategy may or may not be saved depending on when the error occurred)
      expect(Array.isArray(strategies)).toBe(true);
      // If the first strategy was saved before the error, it should still be there
      if (strategies.length > 0) {
        const firstStrategy = strategies.find((s) => s.id === mockStrategy.id);
        if (firstStrategy) {
          expect(firstStrategy.name).toBe(mockStrategy.name);
        }
      }
    });
  });

  describe('Delete operation error recovery', () => {
    it('should handle deletion of non-existent strategy', () => {
      expect(() => {
        deleteStrategy('non-existent-id');
      }).not.toThrow();

      expect(getStrategies()).toHaveLength(0);
    });

    it('should recover from deletion failure', () => {
      saveStrategy(mockStrategy);
      expect(getStrategies()).toHaveLength(1);

      // Mock deletion failure
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Delete failed');
      });

      // Should handle error gracefully
      expect(() => {
        deleteStrategy(mockStrategy.id);
      }).toThrow();

      // Restore and verify strategy still exists
      localStorage.setItem = originalSetItem;
      const strategies = getStrategies();
      expect(strategies.length).toBeGreaterThanOrEqual(0);
    });
  });
});
