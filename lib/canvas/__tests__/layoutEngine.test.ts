/**
 * Tests for canvas layout engine
 */

import { describe, expect, it } from 'vitest';
import type { LegoBlock } from '../../../types';
import { smartLayout } from '../layoutEngine';
import type { BlockNode, FlowEdge } from '../types';

describe('smartLayout', () => {
  const createMockNode = (id: string, block: LegoBlock): BlockNode => ({
    id,
    type: 'blockNode',
    position: { x: 0, y: 0 },
    data: {
      block,
      isSelected: false,
      validationErrors: [],
      onDelete: () => {},
      onSelect: () => {},
      onConfigure: () => {},
    },
  });

  const createMockBlock = (id: string, type: string): LegoBlock => ({
    id,
    type,
    label: `Block ${id}`,
    description: 'Test block',
    category: 'action',
    protocol: 'uniswap',
    icon: 'block',
    params: {},
  });

  it('should layout nodes in a graph', () => {
    const block1 = createMockBlock('block1', 'trigger');
    const block2 = createMockBlock('block2', 'action');
    const block3 = createMockBlock('block3', 'action');

    const nodes: BlockNode[] = [
      createMockNode('block1', block1),
      createMockNode('block2', block2),
      createMockNode('block3', block3),
    ];

    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'block1',
        target: 'block2',
        type: 'smoothstep',
        data: { animated: true },
      },
      {
        id: 'e2',
        source: 'block2',
        target: 'block3',
        type: 'smoothstep',
        data: { animated: true },
      },
    ];

    smartLayout(nodes, edges);

    // Nodes should have positions assigned
    expect(nodes[0].position.x).not.toBe(0);
    expect(nodes[0].position.y).not.toBe(0);
    expect(nodes[1].position.x).not.toBe(0);
    expect(nodes[1].position.y).not.toBe(0);
  });

  it('should handle single node', () => {
    const block1 = createMockBlock('block1', 'trigger');
    const nodes: BlockNode[] = [createMockNode('block1', block1)];
    const edges: FlowEdge[] = [];

    smartLayout(nodes, edges);

    expect(nodes[0].position.x).not.toBe(0);
    expect(nodes[0].position.y).not.toBe(0);
  });

  it('should handle empty nodes', () => {
    const nodes: BlockNode[] = [];
    const edges: FlowEdge[] = [];

    expect(() => smartLayout(nodes, edges)).not.toThrow();
  });

  it('should position nodes based on graph structure', () => {
    const block1 = createMockBlock('block1', 'trigger');
    const block2 = createMockBlock('block2', 'action');
    const block3 = createMockBlock('block3', 'action');

    const nodes: BlockNode[] = [
      createMockNode('block1', block1),
      createMockNode('block2', block2),
      createMockNode('block3', block3),
    ];

    const edges: FlowEdge[] = [
      {
        id: 'e1',
        source: 'block1',
        target: 'block2',
        type: 'smoothstep',
        data: { animated: true },
      },
      {
        id: 'e2',
        source: 'block1',
        target: 'block3',
        type: 'smoothstep',
        data: { animated: true },
      },
    ];

    smartLayout(nodes, edges);

    // All nodes should have different positions
    const positions = nodes.map((n) => `${n.position.x},${n.position.y}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(3);
  });
});
