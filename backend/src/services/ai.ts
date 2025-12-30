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
  _userQuery?: string
): Promise<AISuggestion[]> {
  // Use Gemini API if available, otherwise fallback to rule-based
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // Fallback to rule-based suggestions
    return getRuleBasedSuggestions(currentBlocks, _userQuery);
  }

  try {
    // Enhanced rule-based suggestions with user query context
    const suggestions = getRuleBasedSuggestions(currentBlocks, _userQuery);
    
    // If user query is provided, add query-specific suggestions
    if (_userQuery) {
      const queryLower = _userQuery.toLowerCase();
      
      // Check for common DeFi terms in query
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
    
    return suggestions;
  } catch (error) {
    console.error('AI service error:', error);
    return getRuleBasedSuggestions(currentBlocks, userQuery);
  }
}

/**
 * Rule-based fallback suggestions
 */
function getRuleBasedSuggestions(
  currentBlocks: unknown[],
  userQuery?: string
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

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
