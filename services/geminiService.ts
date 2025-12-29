import { GoogleGenAI, Type } from '@google/genai';
import { AVAILABLE_BLOCKS } from '../constants';
import type { LegoBlock } from '../types';

// API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

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
 * Suggests next blocks using Gemini AI with retry logic and cancellation support
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
  if (!ai) {
    console.warn('Gemini API Key missing. Returning fallback suggestions.');
    return fallbackSuggestions(currentBlocks, query);
  }

  const currentStructure = currentBlocks.map((b) => `${b.label} (${b.category})`).join(' -> ');
  const availableBlocksInfo = AVAILABLE_BLOCKS.map(
    (b) => `${b.id}: ${b.label} - ${b.description}`
  ).join('\n');

  const prompt = `
    You are a DeFi strategy assistant.
    Current Strategy Spine: ${currentStructure || 'Empty Strategy'}
    User Query: ${query || 'Suggest the next logical step.'}
    
    Available Blocks:
    ${availableBlocksInfo}

    Return a JSON array of up to 3 'id' strings from the Available Blocks list that would be the best next logical blocks to add.
    Prioritize valid DeFi workflows (e.g., Entry -> Swap -> Supply -> Exit).
  `;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Check if cancelled
    if (signal?.aborted) {
      throw new Error('Request cancelled');
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      });

      const suggestedIds = JSON.parse(response.text || '[]');
      return AVAILABLE_BLOCKS.filter((b) => suggestedIds.includes(b.id));
    } catch (error) {
      lastError = error;

      // Don't retry on cancellation
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      // Don't retry on last attempt
      if (attempt === MAX_RETRIES - 1) {
        break;
      }

      // Check if error is retryable
      const isRetryable =
        error instanceof Error &&
        (error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('rate limit'));

      if (!isRetryable) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // All retries failed, return fallback
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  console.error('Gemini AI Error after retries:', errorMessage, lastError);
  return fallbackSuggestions(currentBlocks, query);
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
