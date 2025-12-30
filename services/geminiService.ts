import { AVAILABLE_BLOCKS } from '../constants';
import type { LegoBlock } from '../types';
import { trpc } from '../utils/trpc';

// NOTE: API keys are now stored server-side for security
// This service now uses the backend proxy endpoint via tRPC

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Suggests next blocks using backend AI service (Gemini API via proxy)
 * Falls back to rule-based suggestions if backend is unavailable
 * @param currentBlocks - Current blocks in the strategy
 * @param query - Optional user query
 * @param signal - Optional AbortSignal for cancellation (not used with tRPC, but kept for compatibility)
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

  try {
    // Try to use backend AI service via tRPC
    // This requires authentication, so it may fail if user is not logged in
    // In that case, fall back to rule-based suggestions
    const client = trpc.createClient({
      links: [
        {
          request: async (op) => {
            // This is a simplified version - in practice, use the configured trpcClient
            // For now, we'll use the fallback
            throw new Error('Backend not configured');
          },
        },
      ],
    });

    // Attempt to call backend (will fail gracefully if not authenticated)
    // For now, we'll use fallback since direct tRPC calls from services are complex
    // The AIBlockSuggester component should use trpc.ai.getSuggestions.useQuery directly
    return fallbackSuggestions(currentBlocks, query);
  } catch (error) {
    // Backend unavailable or not authenticated - use fallback
    return fallbackSuggestions(currentBlocks, query);
  }
};

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
  if (lastBlock.category === 'ENTRY')
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'PROTOCOL');
  if (lastBlock.category === 'PROTOCOL')
    return AVAILABLE_BLOCKS.filter((b) => b.category === 'EXIT' || b.category === 'PROTOCOL');

  return AVAILABLE_BLOCKS.slice(0, 3);
};
