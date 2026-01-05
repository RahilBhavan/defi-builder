/**
 * Tests for canvas/spine conversion utilities
 */

import { describe, expect, it, vi } from 'vitest';
import type { LegoBlock } from '../../../types';
import { blocksToCanvasElements, canvasNodesToBlocks } from '../canvas';

describe('blocksToCanvasElements', () => {
  const mockBlocks: LegoBlock[] = [
    {
      id: 'block1',
      type: 'price_trigger',
      label: 'Price Trigger',
      description: 'Test block',
      category: 'trigger',
      protocol: 'uniswap',
      icon: 'trigger',
      params: { asset: 'ETH', targetPrice: 2000 },
    },
    {
      id: 'block2',
      type: 'uniswap_swap',
      label: 'Swap',
      description: 'Test block',
      category: 'action',
      protocol: 'uniswap',
      icon: 'swap',
      params: { inputToken: 'ETH', outputToken: 'USDC', amount: 1 },
    },
  ];

  it('should convert blocks to canvas nodes and edges', () => {
    const result = blocksToCanvasElements(mockBlocks);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it('should create nodes with correct structure', () => {
    const result = blocksToCanvasElements(mockBlocks);
    const node = result.nodes[0];
    expect(node.id).toBe('block1');
    expect(node.data.block).toEqual(mockBlocks[0]);
    expect(node.data.isSelected).toBe(false);
  });

  it('should create edges between consecutive blocks', () => {
    const result = blocksToCanvasElements(mockBlocks);
    expect(result.edges[0].source).toBe('block1');
    expect(result.edges[0].target).toBe('block2');
  });

  it('should handle empty blocks array', () => {
    const result = blocksToCanvasElements([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should handle single block', () => {
    const result = blocksToCanvasElements([mockBlocks[0]]);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it('should include callback functions in node data', () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    const onConfigure = vi.fn();

    const result = blocksToCanvasElements(mockBlocks, {
      onDelete,
      onSelect,
      onConfigure,
    });

    expect(result.nodes[0].data.onDelete).toBe(onDelete);
    expect(result.nodes[0].data.onSelect).toBe(onSelect);
    expect(result.nodes[0].data.onConfigure).toBe(onConfigure);
  });
});

describe('canvasNodesToBlocks', () => {
  it('should convert canvas nodes back to blocks', () => {
    const mockBlocks: LegoBlock[] = [
      {
        id: 'block1',
        type: 'price_trigger',
        label: 'Price Trigger',
        description: 'Test',
        category: 'trigger',
        protocol: 'uniswap',
        icon: 'trigger',
        params: { asset: 'ETH' },
      },
    ];

    const { nodes } = blocksToCanvasElements(mockBlocks);
    const blocks = canvasNodesToBlocks(nodes);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual(mockBlocks[0]);
  });

  it('should maintain order based on x position', () => {
    const mockBlocks: LegoBlock[] = [
      {
        id: 'block1',
        type: 'price_trigger',
        label: 'Block 1',
        description: 'Test',
        category: 'trigger',
        protocol: 'uniswap',
        icon: 'trigger',
        params: {},
      },
      {
        id: 'block2',
        type: 'uniswap_swap',
        label: 'Block 2',
        description: 'Test',
        category: 'action',
        protocol: 'uniswap',
        icon: 'swap',
        params: {},
      },
    ];

    const { nodes } = blocksToCanvasElements(mockBlocks);
    // Swap positions
    nodes[0].position.x = 500;
    nodes[1].position.x = 100;

    const blocks = canvasNodesToBlocks(nodes);
    // Should be sorted by x position
    expect(blocks[0].id).toBe('block2');
    expect(blocks[1].id).toBe('block1');
  });
});
