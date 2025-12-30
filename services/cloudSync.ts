/**
 * Cloud Sync Service
 * Syncs strategies to backend for cloud storage and sharing
 */

import type { Strategy } from '../types';
import { trpc } from '../utils/trpc';

/**
 * Type-safe access to strategies router
 * Uses type assertion due to tRPC v10/v11 version mismatch
 * TODO: Remove when backend is upgraded to @trpc/server v11
 */
type StrategiesRouter = typeof trpc.strategies;

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
 * 
 * Provides functions to sync strategies to/from the backend cloud storage.
 * Requires user to be authenticated (protectedProcedure).
 * 
 * @returns Object containing:
 * - `strategies`: Array of strategies from cloud
 * - `isLoading`: Loading state
 * - `syncStrategy`: Function to sync a strategy to cloud
 * - `updateStrategy`: Function to update a strategy in cloud
 * - `deleteStrategy`: Function to delete a strategy from cloud
 * 
 * @example
 * ```typescript
 * const { strategies, syncStrategy, isLoading } = useCloudSync();
 * 
 * const handleSave = async () => {
 *   await syncStrategy(currentStrategy);
 * };
 * ```
 */
export function useCloudSync() {
  const utils = trpc.useUtils();
  
  // Type assertion needed due to tRPC version mismatch (backend v10 vs frontend v11)
  // TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strategiesRouter = trpc.strategies as any;
  
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const createMutation = strategiesRouter.create.useMutation();
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const updateMutation = strategiesRouter.update.useMutation();
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const deleteMutation = strategiesRouter.delete.useMutation();
  // @ts-expect-error - tRPC version mismatch: backend v10 vs frontend v11
  const { data: strategies, isLoading } = strategiesRouter.list.useQuery();

  const syncStrategy = async (strategy: Strategy) => {
    const nodeGraph = blocksToNodeGraph(strategy.blocks);
    await createMutation.mutateAsync({
      name: strategy.name,
      description: `Strategy with ${strategy.blocks.length} blocks`,
      nodeGraph,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (utils.strategies as any).list.invalidate();
  };

  const deleteStrategy = async (strategyId: string) => {
    await deleteMutation.mutateAsync({ id: strategyId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
