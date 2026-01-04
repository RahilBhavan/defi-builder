import type { Edge, Node } from '@xyflow/react';
import type { LegoBlock } from '../../types';

// Legacy types for backwards compatibility
export interface StrategyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    blockType: string;
    [key: string]: unknown;
  };
}

export interface StrategyEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

// Re-export new canvas types
export type { BlockNode, BlockNodeData, FlowEdge, FlowEdgeData } from '../../lib/canvas/types';
