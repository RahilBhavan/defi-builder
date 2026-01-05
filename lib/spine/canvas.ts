import type { LegoBlock } from '../../types';
import type { BlockNode, BlockNodeData, FlowEdge } from '../canvas/types';

const NODE_WIDTH = 280;
const HORIZONTAL_SPACING = 100;
const VERTICAL_SPACING = 80;

/**
 * Convert LegoBlocks to XYFlow nodes and edges
 * Uses a horizontal flow layout by default
 */
export function blocksToCanvasElements(
  blocks: LegoBlock[],
  options?: {
    onDelete?: (id: string) => void;
    onSelect?: (id: string) => void;
    onConfigure?: (id: string) => void;
  }
): {
  nodes: BlockNode[];
  edges: FlowEdge[];
} {
  const { onDelete, onSelect, onConfigure } = options ?? {};

  const nodes: BlockNode[] = blocks.map((block, index) => ({
    id: block.id,
    type: 'blockNode',
    position: {
      x: index * (NODE_WIDTH + HORIZONTAL_SPACING),
      y: VERTICAL_SPACING,
    },
    data: {
      block,
      isSelected: false,
      validationErrors: [],
      onDelete: onDelete ?? (() => {}),
      onSelect: onSelect ?? (() => {}),
      onConfigure: onConfigure ?? (() => {}),
    } satisfies BlockNodeData,
  }));

  const edges: FlowEdge[] = [];

  for (let i = 0; i < blocks.length - 1; i++) {
    const block = blocks[i];
    const targetBlock = blocks[i + 1];

    if (block && targetBlock) {
      edges.push({
        id: `edge-${block.id}-${targetBlock.id}`,
        source: block.id,
        target: targetBlock.id,
        type: 'smoothstep',
        animated: true,
        data: {
          animated: true,
          sourceProtocol: block.protocol,
          targetProtocol: targetBlock.protocol,
        },
      });
    }
  }

  return { nodes, edges };
}

/**
 * Convert canvas nodes back to LegoBlocks
 */
export function canvasNodesToBlocks(nodes: BlockNode[]): LegoBlock[] {
  // Sort nodes by x position to maintain order
  const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);
  return sortedNodes.map((node) => node.data.block);
}

// Legacy export for backwards compatibility
export function spineBlocksToReactFlow(blocks: LegoBlock[]) {
  return blocksToCanvasElements(blocks);
}
