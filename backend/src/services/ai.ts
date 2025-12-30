/**
 * AI Service for DeFi Builder
 * Provides context-aware suggestions and assistance using Gemini API
 * All API keys are stored server-side for security
 */

import { GoogleGenAI, Type } from '@google/genai';

interface AISuggestion {
  type: 'block' | 'parameter' | 'strategy';
  suggestion: string;
  confidence: number;
  reasoning: string;
  blockIds?: string[]; // Suggested block IDs
}

interface ProtocolDocumentation {
  protocol: string;
  operations: string[];
  parameters: Record<string, string>;
}

// Initialize Gemini AI client (server-side only)
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get AI suggestions based on current strategy context
 * Uses Gemini API if available, otherwise falls back to rule-based suggestions
 */
export async function getAISuggestions(
  currentBlocks: unknown[],
  userQuery?: string
): Promise<AISuggestion[]> {
  // Always start with rule-based suggestions
  const suggestions = getRuleBasedSuggestions(currentBlocks, userQuery);

  // If Gemini API is available, enhance with AI suggestions
  if (ai && apiKey) {
    try {
      const aiSuggestions = await getGeminiSuggestions(currentBlocks, userQuery);
      // Merge AI suggestions with rule-based ones
      return [...suggestions, ...aiSuggestions];
    } catch (error) {
      console.error('Gemini API error (falling back to rule-based):', error);
      // Return rule-based suggestions on error
      return suggestions;
    }
  }

  return suggestions;
}

/**
 * Get suggestions from Gemini API
 */
async function getGeminiSuggestions(
  currentBlocks: unknown[],
  userQuery?: string
): Promise<AISuggestion[]> {
  if (!ai) {
    return [];
  }

  // Build context for AI
  const currentStructure = currentBlocks
    .map((b: unknown) => {
      const block = b as { label?: string; category?: string };
      return `${block.label || 'Unknown'} (${block.category || 'UNKNOWN'})`;
    })
    .join(' -> ');

  const prompt = `
    You are a DeFi strategy assistant helping users build trading strategies.
    Current Strategy: ${currentStructure || 'Empty Strategy'}
    User Query: ${userQuery || 'Suggest the next logical step'}
    
    Suggest the next 1-3 blocks that would logically follow in this DeFi strategy.
    Focus on valid DeFi workflows (Entry -> Protocol -> Exit).
    Return a JSON array of block suggestions with reasoning.
  `;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      lastError = error;

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

      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // All retries failed
  if (lastError) {
    console.error('Gemini API error after retries:', lastError);
  }

  return [];
}

/**
 * Rule-based fallback suggestions
 * Used when AI is unavailable or as a baseline
 */
function getRuleBasedSuggestions(
  currentBlocks: unknown[],
  userQuery?: string
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Handle user query context
  if (userQuery) {
    const queryLower = userQuery.toLowerCase();

    if (queryLower.includes('yield') || queryLower.includes('farm')) {
      suggestions.push({
        type: 'strategy',
        suggestion: 'Consider adding Aave Supply or Compound Supply blocks for yield farming',
        confidence: 0.85,
        reasoning: 'User query mentions yield farming',
      });
    }

    if (queryLower.includes('arbitrage') || queryLower.includes('arb')) {
      suggestions.push({
        type: 'strategy',
        suggestion: 'Add flash loan block and multiple swap blocks for arbitrage',
        confidence: 0.9,
        reasoning: 'User query mentions arbitrage',
      });
    }

    if (queryLower.includes('risk') || queryLower.includes('safe')) {
      suggestions.push({
        type: 'strategy',
        suggestion: 'Add risk limits and stop loss blocks for risk management',
        confidence: 0.9,
        reasoning: 'User query mentions risk management',
      });
    }
  }

  if (currentBlocks.length === 0) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Start with a price trigger or time trigger',
      confidence: 0.8,
      reasoning: 'Strategies typically begin with a trigger condition',
    });
    return suggestions;
  }

  // Analyze strategy structure
  const hasEntry = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string };
    return b.category === 'ENTRY';
  });

  const hasProtocol = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string };
    return b.category === 'PROTOCOL';
  });

  const hasExit = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string };
    return b.category === 'EXIT';
  });

  // Suggest based on missing components
  if (!hasEntry) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Add an entry trigger (price, time, or volume trigger)',
      confidence: 0.9,
      reasoning: 'Strategies need an entry condition to start',
    });
  }

  if (hasEntry && !hasProtocol) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Add a protocol action (swap, supply, borrow, etc.)',
      confidence: 0.9,
      reasoning: 'Entry triggers need protocol actions to execute',
    });
  }

  if (hasEntry && hasProtocol && !hasExit) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Add a stop loss or take profit block',
      confidence: 0.9,
      reasoning: 'Risk management is important for DeFi strategies',
    });
  }

  // Check for risk management
  const hasRiskManagement = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string; type?: string };
    return b.category === 'RISK' || b.type === 'stop_loss' || b.type === 'risk_limits';
  });

  if (hasProtocol && !hasRiskManagement) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Consider adding risk limits or position sizing',
      confidence: 0.7,
      reasoning: 'Risk management helps protect capital',
    });
  }

  return suggestions;
}

/**
 * Get protocol documentation for context
 */
export async function getProtocolDocumentation(
  protocol: string
): Promise<ProtocolDocumentation | null> {
  // In production, this would query a vector database or documentation API
  const docs: Record<string, ProtocolDocumentation> = {
    uniswap_v3: {
      protocol: 'Uniswap V3',
      operations: ['swap', 'addLiquidity', 'removeLiquidity'],
      parameters: {
        tokenIn: 'Input token address',
        tokenOut: 'Output token address',
        amount: 'Amount to swap',
        slippage: 'Maximum acceptable slippage (%)',
      },
    },
    aave_v3: {
      protocol: 'Aave V3',
      operations: ['supply', 'borrow', 'repay', 'withdraw'],
      parameters: {
        asset: 'Token address to supply/borrow',
        amount: 'Amount to supply/borrow',
        interestRateMode: 'stable or variable',
      },
    },
  };

  return docs[protocol] || null;
}
