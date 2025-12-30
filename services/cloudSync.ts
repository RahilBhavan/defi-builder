/**
 * Cloud Sync Service
 * Syncs strategies to backend for cloud storage and sharing
 */

import type { Strategy } from '../types';
import { trpc } from '../utils/trpc';
import { logger } from '../utils/logger';
import { retryWithBackoff, isRetryableError } from '../utils/retry';

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
    logger.error('Error parsing nodeGraph', error instanceof Error ? error : new Error(String(error)), 'CloudSync');
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
  
  const createMutation = trpc.strategies.create.useMutation();
  const updateMutation = trpc.strategies.update.useMutation();
  const deleteMutation = trpc.strategies.delete.useMutation();
  const { data: strategies, isLoading } = trpc.strategies.list.useQuery();

  const syncStrategy = async (strategy: Strategy): Promise<void> => {
    try {
      const nodeGraph = blocksToNodeGraph(strategy.blocks);
      await retryWithBackoff(
        async () => {
          await createMutation.mutateAsync({
            name: strategy.name,
            description: `Strategy with ${strategy.blocks.length} blocks`,
            nodeGraph,
          });
        },
        {
          maxRetries: 3,
          retryable: isRetryableError,
        }
      );
      await utils.strategies.list.invalidate();
    } catch (error) {
      logger.error('Failed to sync strategy to cloud', error instanceof Error ? error : new Error(String(error)), 'CloudSync');
      throw new Error('Failed to sync strategy. Please check your internet connection and try again.');
    }
  };

  const updateStrategy = async (strategyId: string, strategy: Strategy): Promise<void> => {
    try {
      const nodeGraph = blocksToNodeGraph(strategy.blocks);
      await retryWithBackoff(
        async () => {
          await updateMutation.mutateAsync({
            id: strategyId,
            name: strategy.name,
            description: `Strategy with ${strategy.blocks.length} blocks`,
            nodeGraph,
          });
        },
        {
          maxRetries: 3,
          retryable: isRetryableError,
        }
      );
      await utils.strategies.list.invalidate();
    } catch (error) {
      logger.error('Failed to update strategy in cloud', error instanceof Error ? error : new Error(String(error)), 'CloudSync');
      throw new Error('Failed to update strategy. Please check your internet connection and try again.');
    }
  };

  const deleteStrategy = async (strategyId: string): Promise<void> => {
    try {
      await retryWithBackoff(
        async () => {
          await deleteMutation.mutateAsync({ id: strategyId });
        },
        {
          maxRetries: 3,
          retryable: isRetryableError,
        }
      );
      await utils.strategies.list.invalidate();
    } catch (error) {
      logger.error('Failed to delete strategy from cloud', error instanceof Error ? error : new Error(String(error)), 'CloudSync');
      throw new Error('Failed to delete strategy. Please check your internet connection and try again.');
    }
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
