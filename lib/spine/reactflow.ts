import type { StrategyEdge, StrategyNode } from '../components/studio/types';
import type { LegoBlock } from '../types';

export function spineBlocksToReactFlow(blocks: LegoBlock[]): {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
} {
  const nodes: StrategyNode[] = blocks.map((block, index) => ({
    id: block.id,
    type: 'default',
    position: { x: index * 200, y: 0 },
    data: {
      label: block.label,
      blockType: block.type,
      ...block.params,
    },
  }));

  const edges: StrategyEdge[] = blocks
    .slice(0, -1)
    .map((block, index) => ({
      id: `edge-${block.id}-${blocks[index + 1]?.id}`,
      source: block.id,
      target: blocks[index + 1]?.id || '',
      type: 'smoothstep',
      animated: false,
    }))
    .filter((edge) => edge.target !== '');

  return { nodes, edges };
}
