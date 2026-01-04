/**
 * Marketplace service utilities
 */

import { trpc } from '../../../lib/api/trpc';
import { logger } from '../../../lib/monitoring/logger';

// Type assertion to work around TypeScript inference issue with nested routers
// Biome-ignore lint/suspicious/noExplicitAny: tRPC version mismatch (backend v10, frontend v11) - see lib/api/helpers.ts
// TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertion
const typedTrpc = trpc as any;

export interface MarketplaceStrategy {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  viewCount: number;
  forkCount: number;
  likeCount: number;
  averageRating: number;
  ratingCount: number;
  isFeatured: boolean;
  user: {
    id: string;
    walletAddress: string;
    username?: string;
    avatarUrl?: string;
  };
  createdAt: Date;
}

/**
 * Search strategies in the marketplace
 */
export async function searchStrategies(query: {
  search?: string;
  category?: string;
  tags?: string[];
  sortBy?: 'newest' | 'popular' | 'trending' | 'rating';
  page?: number;
  limit?: number;
}) {
  try {
    return await typedTrpc.marketplace.discover.query(query);
  } catch (error) {
    logger.error(
      'Error searching strategies',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Get featured strategies
 */
export async function getFeaturedStrategies() {
  try {
    return await typedTrpc.marketplace.featured.query();
  } catch (error) {
    logger.error(
      'Error fetching featured strategies',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Get strategy details
 */
export async function getStrategyDetails(strategyId: string) {
  try {
    return await typedTrpc.marketplace.getStrategy.query({ id: strategyId });
  } catch (error) {
    logger.error(
      'Error fetching strategy details',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Fork a strategy
 */
export async function forkStrategy(originalId: string, name: string, description?: string) {
  try {
    return await typedTrpc.marketplace.forkStrategy.mutate({
      originalId,
      name,
      description,
    });
  } catch (error) {
    logger.error(
      'Error forking strategy',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Rate a strategy
 */
export async function rateStrategy(strategyId: string, rating: number) {
  try {
    return await typedTrpc.marketplace.rateStrategy.mutate({
      strategyId,
      rating,
    });
  } catch (error) {
    logger.error(
      'Error rating strategy',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Add a review to a strategy
 */
export async function addReview(strategyId: string, content: string) {
  try {
    return await typedTrpc.marketplace.addReview.mutate({
      strategyId,
      content,
    });
  } catch (error) {
    logger.error(
      'Error adding review',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}

/**
 * Update strategy visibility (make public/private)
 */
export async function updateStrategyVisibility(
  strategyId: string,
  isPublic: boolean,
  category?: string,
  tags?: string[]
) {
  try {
    return await typedTrpc.marketplace.updateVisibility.mutate({
      strategyId,
      isPublic,
      category,
      tags,
    });
  } catch (error) {
    logger.error(
      'Error updating strategy visibility',
      error instanceof Error ? error : new Error(String(error)),
      'Marketplace'
    );
    throw error;
  }
}
