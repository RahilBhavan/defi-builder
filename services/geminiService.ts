import { AVAILABLE_BLOCKS } from '../constants';
import type { LegoBlock } from '../types';

// NOTE: API keys are now stored server-side for security
// This service provides fallback suggestions only
// AI-powered suggestions should be called via tRPC from components (trpc.ai.getSuggestions.useQuery)

/**
 * Custom error class for API errors
 */
export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

/**
 * Suggests next blocks using rule-based heuristics
 * For AI-powered suggestions, use trpc.ai.getSuggestions.useQuery in components
 * @param currentBlocks - Current blocks in the strategy
 * @param query - Optional user query
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to suggested blocks
 */
export const suggestNextBlocks = async (
  currentBlocks: LegoBlock[],
  query?: string,
  signal?: AbortSignal
): Promise<LegoBlock[]> => {
  // Check if cancelled
  if (signal?.aborted) {
    throw new Error('Request cancelled');
  }

  // Use fallback heuristics
  return fallbackSuggestions(currentBlocks, query);
};

/**
 * Rule-based suggestion fallback
 */
function fallbackSuggestions(currentBlocks: LegoBlock[], query?: string): LegoBlock[] {
  // Filter by query if provided
  if (query) {
    const lowerQ = query.toLowerCase();
    return AVAILABLE_BLOCKS.filter(
      (b) => b.label.toLowerCase().includes(lowerQ) || b.description.toLowerCase().includes(lowerQ)
    );
  }

  // Suggest entry blocks for empty strategies
  if (currentBlocks.length === 0) {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'ENTRY');
  }

  // Context-aware suggestions based on last block
  const lastBlock = currentBlocks[currentBlocks.length - 1];

  if (!lastBlock) {
    return AVAILABLE_BLOCKS.slice(0, 3);
  }

  if (lastBlock.category === 'ENTRY') {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'PROTOCOL');
  }

  if (lastBlock.category === 'PROTOCOL') {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'EXIT' || b.category === 'PROTOCOL');
  }

  return AVAILABLE_BLOCKS.slice(0, 3);
}
