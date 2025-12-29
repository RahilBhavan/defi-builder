/**
 * AI Service for DeFi Builder
 * Provides context-aware suggestions and assistance
 */

interface AISuggestion {
  type: 'block' | 'parameter' | 'strategy';
  suggestion: string;
  confidence: number;
  reasoning: string;
}

interface ProtocolDocumentation {
  protocol: string;
  operations: string[];
  parameters: Record<string, string>;
}

/**
 * Get AI suggestions based on current strategy context
 */
export async function getAISuggestions(
  currentBlocks: unknown[],
  userQuery?: string
): Promise<AISuggestion[]> {
  // In production, this would:
  // 1. Call OpenAI API with context
  // 2. Use LangChain for structured output
  // 3. Retrieve relevant protocol documentation
  // 4. Return ranked suggestions

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to rule-based suggestions
    return getRuleBasedSuggestions(currentBlocks);
  }

  try {
    // TODO: Implement OpenAI integration
    // const response = await openai.chat.completions.create({...});
    return getRuleBasedSuggestions(currentBlocks);
  } catch (error) {
    console.error('AI service error:', error);
    return getRuleBasedSuggestions(currentBlocks);
  }
}

/**
 * Rule-based fallback suggestions
 */
function getRuleBasedSuggestions(currentBlocks: unknown[]): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  if (currentBlocks.length === 0) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Start with a price trigger or time trigger',
      confidence: 0.8,
      reasoning: 'Strategies typically begin with a trigger condition',
    });
  }

  // Check if strategy has entry but no exit
  const hasEntry = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string };
    return b.category === 'ENTRY';
  });
  const hasExit = currentBlocks.some((block: unknown) => {
    const b = block as { category?: string };
    return b.category === 'EXIT';
  });

  if (hasEntry && !hasExit) {
    suggestions.push({
      type: 'strategy',
      suggestion: 'Add a stop loss or take profit block',
      confidence: 0.9,
      reasoning: 'Risk management is important for DeFi strategies',
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
