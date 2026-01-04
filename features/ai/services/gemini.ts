import { AVAILABLE_BLOCKS } from '../../../constants';
import type { LegoBlock } from '../../../types';

// NOTE: API keys are now stored server-side for security
// This service provides fallback suggestions - AI suggestions should be called via tRPC from components
// The AIBlockSuggester component should use trpc.ai.getSuggestions.useQuery directly

/**
 * Custom error class for API errors
 */
export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable = false
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

/**
 * Suggest next blocks using fallback heuristics
 * For AI-powered suggestions, use trpc.ai.getSuggestions.useQuery in components
 */
export async function suggestNextBlocks(
  currentBlocks: LegoBlock[],
  query?: string
): Promise<LegoBlock[]> {
  // Use fallback suggestions - AI suggestions should be called via tRPC from components
  // The AIBlockSuggester component should use trpc.ai.getSuggestions.useQuery directly
  return fallbackSuggestions(currentBlocks, query);
}

const fallbackSuggestions = (currentBlocks: LegoBlock[], query?: string): LegoBlock[] => {
  // Simple heuristic fallback
  if (query) {
    const lowerQ = query.toLowerCase();
    return AVAILABLE_BLOCKS.filter(
      (b) => b.label.toLowerCase().includes(lowerQ) || b.description.toLowerCase().includes(lowerQ)
    );
  }

  if (currentBlocks.length === 0) {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'ENTRY');
  }

  const lastBlock = currentBlocks[currentBlocks.length - 1];
  if (lastBlock && lastBlock.category === 'ENTRY') {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'PROTOCOL');
  }
  if (lastBlock && lastBlock.category === 'PROTOCOL') {
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'EXIT' || b.category === 'PROTOCOL');
  }

  return AVAILABLE_BLOCKS.slice(0, 3);
};
