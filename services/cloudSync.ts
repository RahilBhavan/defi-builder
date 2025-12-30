/**
 * Cloud Sync Service
 * Syncs strategies to backend for cloud storage and sharing
 */

import type { Strategy } from '../types';
import { trpc } from '../utils/trpc';

/**
 * Convert blocks to nodeGraph format for backend storage
 */
export function blocksToNodeGraph(blocks: Strategy['blocks']): Record<string, unknown> {
  // For now, store blocks as a simple array
  // In future, this could be converted to ReactFlow node graph format
  return {
    blocks: blocks.map((block) => ({
      id: block.id,
      type: block.type,
      label: block.label,
      category: block.category,
      protocol: block.protocol,
      icon: block.icon,
      params: block.params,
    })),
  };
}

/**
 * Convert nodeGraph to blocks
 */
export function nodeGraphToBlocks(nodeGraph: unknown): Strategy['blocks'] {
  try {
    const graph = nodeGraph as { blocks?: unknown[] };
    if (graph.blocks && Array.isArray(graph.blocks)) {
      return graph.blocks as Strategy['blocks'];
    }
  } catch (error) {
    console.error('Error parsing nodeGraph:', error);
  }
  return [];
}

/**
 * Hook for using cloud sync in components
 * Note: Requires user to be authenticated (protectedProcedure)
 */
export function useCloudSync() {
  const utils = trpc.useUtils();
  
  // Type assertion workaround for nested router type inference
  // TODO: Fix when backend @trpc/server is upgraded to v11 to match frontend
  const strategiesRouter = trpc.strategies as any;
  
  const createMutation = strategiesRouter.create.useMutation();
  const updateMutation = strategiesRouter.update.useMutation();
  const deleteMutation = strategiesRouter.delete.useMutation();
  const { data: strategies, isLoading } = strategiesRouter.list.useQuery();

  const syncStrategy = async (strategy: Strategy) => {
    const nodeGraph = blocksToNodeGraph(strategy.blocks);
    await createMutation.mutateAsync({
      name: strategy.name,
      description: `Strategy with ${strategy.blocks.length} blocks`,
      nodeGraph,
    });
    await (utils.strategies as any).list.invalidate();
  };

  const updateStrategy = async (strategyId: string, strategy: Strategy) => {
    const nodeGraph = blocksToNodeGraph(strategy.blocks);
    await updateMutation.mutateAsync({
      id: strategyId,
      name: strategy.name,
      description: `Strategy with ${strategy.blocks.length} blocks`,
      nodeGraph,
    });
    await (utils.strategies as any).list.invalidate();
  };

  const deleteStrategy = async (strategyId: string) => {
    await deleteMutation.mutateAsync({ id: strategyId });
    await (utils.strategies as any).list.invalidate();
  };

  const cloudStrategies: Strategy[] = strategies
    ? strategies.map((s: { id: string; name: string; description: string | null; nodeGraph: unknown; createdAt: Date; updatedAt: Date }) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        blocks: nodeGraphToBlocks(s.nodeGraph),
        createdAt: s.createdAt.getTime(),
        updatedAt: s.updatedAt.getTime(),
      }))
    : [];

  return {
    strategies: cloudStrategies,
    isLoading,
    syncStrategy,
    updateStrategy,
    deleteStrategy,
  };
}
