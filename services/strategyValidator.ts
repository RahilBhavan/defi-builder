import { LegoBlock, ValidationResult } from '../types';

/**
 * Validates a DeFi strategy by checking all blocks for required parameters and constraints.
 * 
 * @param blocks - Array of LegoBlock instances to validate
 * @returns ValidationResult containing validation status and any error messages
 */
export const validateStrategy = (blocks: LegoBlock[]): ValidationResult => {
  const errors: { blockId: string; message: string }[] = [];
  
  if (blocks.length === 0) {
    return { valid: false, errors: [] };
  }

  // Example validation logic
  blocks.forEach(block => {
    // Check required params for Uniswap
    if (block.type === 'uniswap_swap') {
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Swap Amount must be greater than 0' });
      }
    }
    
    // Check required params for Trigger
    if (block.type === 'price_trigger') {
      if (!block.params.targetPrice || Number(block.params.targetPrice) <= 0) {
        errors.push({ blockId: block.id, message: 'Target Price required' });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
