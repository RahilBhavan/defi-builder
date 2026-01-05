import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blocksToNodeGraph, nodeGraphToBlocks } from '../../services/cloudSync';
import { deleteStrategy, getStrategies, saveStrategy } from '../../services/strategyStorage';
import { BlockCategory, Protocol } from '../../types';
import type { LegoBlock, Strategy } from '../../types';

describe('Cloud Sync Operations', () => {
  let mockBlocks: LegoBlock[];
  let mockStrategy: Strategy;

  beforeEach(() => {
    // Clear localStorage before each test
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

  describe('blocksToNodeGraph and nodeGraphToBlocks', () => {
    it('should convert blocks to nodeGraph format', () => {
      const nodeGraph = blocksToNodeGraph(mockBlocks);

      expect(nodeGraph).toHaveProperty('blocks');
      expect(Array.isArray(nodeGraph.blocks)).toBe(true);
      expect(nodeGraph.blocks).toHaveLength(2);
      expect(nodeGraph.blocks[0]).toHaveProperty('id', '1');
      expect(nodeGraph.blocks[0]).toHaveProperty('type', 'price_trigger');
    });

    it('should convert nodeGraph back to blocks', () => {
      const nodeGraph = blocksToNodeGraph(mockBlocks);
      const convertedBlocks = nodeGraphToBlocks(nodeGraph);

      expect(convertedBlocks).toHaveLength(2);
      expect(convertedBlocks[0].id).toBe('1');
      expect(convertedBlocks[0].type).toBe('price_trigger');
      expect(convertedBlocks[0].params).toEqual(mockBlocks[0].params);
    });

    it('should handle empty blocks array', () => {
      const nodeGraph = blocksToNodeGraph([]);
      expect(nodeGraph.blocks).toEqual([]);

      const convertedBlocks = nodeGraphToBlocks(nodeGraph);
      expect(convertedBlocks).toEqual([]);
    });

    it('should handle invalid nodeGraph gracefully', () => {
      const invalidNodeGraph = { invalid: 'data' };
      const convertedBlocks = nodeGraphToBlocks(invalidNodeGraph);
      expect(convertedBlocks).toEqual([]);
    });
  });

  describe('Strategy sync workflow', () => {
    it('should save strategy locally before syncing', () => {
      saveStrategy(mockStrategy);
      const saved = getStrategies();

      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(mockStrategy.id);
      expect(saved[0].name).toBe(mockStrategy.name);
    });

    it('should update existing strategy when saving with same ID', () => {
      saveStrategy(mockStrategy);

      const updatedStrategy = {
        ...mockStrategy,
        name: 'Updated Strategy Name',
        updatedAt: Date.now(),
      };

      saveStrategy(updatedStrategy);
      const saved = getStrategies();

      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Updated Strategy Name');
    });

    it('should handle multiple strategies', () => {
      const strategy2 = {
        ...mockStrategy,
        id: 'test-strategy-2',
        name: 'Second Strategy',
      };

      saveStrategy(mockStrategy);
      saveStrategy(strategy2);

      const saved = getStrategies();
      expect(saved).toHaveLength(2);
    });

    it('should delete strategy from local storage', () => {
      saveStrategy(mockStrategy);
      expect(getStrategies()).toHaveLength(1);

      deleteStrategy(mockStrategy.id);
      expect(getStrategies()).toHaveLength(0);
    });

    it('should handle deletion of non-existent strategy gracefully', () => {
      expect(() => {
        deleteStrategy('non-existent-id');
      }).not.toThrow();

      expect(getStrategies()).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        saveStrategy(mockStrategy);
      }).toThrow('Failed to save strategy');

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data', () => {
      // Set invalid JSON
      localStorage.setItem('defi-builder-strategies', 'invalid json');

      // Should return empty array instead of throwing
      const strategies = getStrategies();
      expect(Array.isArray(strategies)).toBe(true);
    });
  });
});
