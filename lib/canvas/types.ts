import type { Edge, Node } from '@xyflow/react';
import type { LegoBlock } from '../../types';

/**
 * Block Node Data
 * Contains the block data and callbacks for node interactions
 */
export interface BlockNodeData {
  block: LegoBlock;
  isSelected: boolean;
  validationErrors: string[];
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onConfigure: (id: string) => void;
}

/**
 * Block Node
 * A React Flow node representing a strategy block
 */
export type BlockNode = Node<BlockNodeData, 'blockNode'>;

/**
 * Flow Edge Data
 * Contains metadata about the edge connection
 */
export interface FlowEdgeData {
  animated: boolean;
  sourceProtocol?: string;
  targetProtocol?: string;
}

/**
 * Flow Edge
 * A React Flow edge connecting strategy blocks
 */
export type FlowEdge = Edge<FlowEdgeData>;
