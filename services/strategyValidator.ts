import { BlockCategory, type LegoBlock, type ValidationResult } from '../types';
import { validateNumberRange, validateRequired, validateEnum } from '../utils/validation';

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

  // 1. Validate individual block parameters
  blocks.forEach((block, index) => {
    validateBlockParameters(block, errors);
    validateParameterRanges(block, errors);
  });

  // 2. Validate flow structure (ENTRY → PROTOCOL → EXIT)
  validateFlowStructure(blocks, errors);

  // 3. Validate token compatibility between blocks
  validateTokenCompatibility(blocks, errors);

  // 4. Validate dependencies (e.g., stop loss requires a position)
  validateDependencies(blocks, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates required parameters for each block type
 */
function validateBlockParameters(
  block: LegoBlock,
  errors: { blockId: string; message: string }[]
): void {
  switch (block.type) {
    case 'uniswap_swap':
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Swap Amount must be greater than 0' });
      }
      if (!block.params.inputToken || typeof block.params.inputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Input Token is required' });
      }
      if (!block.params.outputToken || typeof block.params.outputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Output Token is required' });
      }
      if (block.params.inputToken === block.params.outputToken) {
        errors.push({ blockId: block.id, message: 'Input and Output tokens must be different' });
      }
      break;

    case 'aave_supply':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Aave supply' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Supply Amount must be greater than 0' });
      }
      break;

    case 'price_trigger':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for price trigger' });
      }
      if (!block.params.targetPrice || Number(block.params.targetPrice) <= 0) {
        errors.push({ blockId: block.id, message: 'Target Price must be greater than 0' });
      }
      if (
        !block.params.condition ||
        !['>=', '<=', '>', '<', '=='].includes(String(block.params.condition))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Valid condition (>=, <=, >, <, ==) is required',
        });
      }
      break;

    case 'stop_loss':
      if (!block.params.percentage || Number(block.params.percentage) <= 0) {
        errors.push({ blockId: block.id, message: 'Stop Loss percentage must be greater than 0' });
      }
      if (Number(block.params.percentage) >= 100) {
        errors.push({ blockId: block.id, message: 'Stop Loss percentage must be less than 100%' });
      }
      break;

    case 'time_trigger':
      if (!block.params.schedule || typeof block.params.schedule !== 'string') {
        errors.push({ blockId: block.id, message: 'Schedule is required for time trigger' });
      }
      break;

    case 'volume_trigger':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for volume trigger' });
      }
      if (!block.params.minVolume || Number(block.params.minVolume) <= 0) {
        errors.push({ blockId: block.id, message: 'Minimum volume must be greater than 0' });
      }
      if (
        !block.params.timeframe ||
        !['1h', '4h', '24h', '7d'].includes(String(block.params.timeframe))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Valid timeframe (1h, 4h, 24h, 7d) is required',
        });
      }
      break;

    case 'technical_indicator_trigger':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({
          blockId: block.id,
          message: 'Asset is required for technical indicator trigger',
        });
      }
      if (
        !block.params.indicator ||
        !['RSI', 'MACD', 'BB', 'MA'].includes(String(block.params.indicator))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Valid indicator (RSI, MACD, BB, MA) is required',
        });
      }
      if (
        !block.params.condition ||
        !['>=', '<=', '>', '<', '=='].includes(String(block.params.condition))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Valid condition (>=, <=, >, <, ==) is required',
        });
      }
      if (block.params.value === undefined || Number(block.params.value) === 0) {
        errors.push({ blockId: block.id, message: 'Indicator value is required' });
      }
      break;

    case 'aave_borrow':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Aave borrow' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Borrow amount must be greater than 0' });
      }
      if (
        !block.params.interestRateMode ||
        !['stable', 'variable'].includes(String(block.params.interestRateMode))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Interest rate mode (stable or variable) is required',
        });
      }
      break;

    case 'aave_repay':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Aave repay' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Repay amount must be greater than 0' });
      }
      if (
        !block.params.interestRateMode ||
        !['stable', 'variable'].includes(String(block.params.interestRateMode))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Interest rate mode (stable or variable) is required',
        });
      }
      break;

    case 'aave_withdraw':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Aave withdraw' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Withdraw amount must be greater than 0' });
      }
      break;

    case 'uniswap_v3_liquidity':
      if (!block.params.token0 || typeof block.params.token0 !== 'string') {
        errors.push({ blockId: block.id, message: 'Token0 is required' });
      }
      if (!block.params.token1 || typeof block.params.token1 !== 'string') {
        errors.push({ blockId: block.id, message: 'Token1 is required' });
      }
      if (!block.params.amount0 || Number(block.params.amount0) <= 0) {
        errors.push({ blockId: block.id, message: 'Amount0 must be greater than 0' });
      }
      if (!block.params.amount1 || Number(block.params.amount1) <= 0) {
        errors.push({ blockId: block.id, message: 'Amount1 must be greater than 0' });
      }
      if (!block.params.feeTier || ![500, 3000, 10000].includes(Number(block.params.feeTier))) {
        errors.push({
          blockId: block.id,
          message: 'Valid fee tier (500, 3000, 10000) is required',
        });
      }
      break;

    case 'compound_supply':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Compound supply' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Supply amount must be greater than 0' });
      }
      break;

    case 'compound_borrow':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for Compound borrow' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Borrow amount must be greater than 0' });
      }
      break;

    case 'curve_swap':
      if (!block.params.inputToken || typeof block.params.inputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Input token is required for Curve swap' });
      }
      if (!block.params.outputToken || typeof block.params.outputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Output token is required for Curve swap' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Swap amount must be greater than 0' });
      }
      if (block.params.inputToken === block.params.outputToken) {
        errors.push({ blockId: block.id, message: 'Input and Output tokens must be different' });
      }
      break;

    case 'balancer_swap':
      if (!block.params.inputToken || typeof block.params.inputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Input token is required for Balancer swap' });
      }
      if (!block.params.outputToken || typeof block.params.outputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Output token is required for Balancer swap' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Swap amount must be greater than 0' });
      }
      if (block.params.inputToken === block.params.outputToken) {
        errors.push({ blockId: block.id, message: 'Input and Output tokens must be different' });
      }
      break;

    case 'oneinch_swap':
      if (!block.params.inputToken || typeof block.params.inputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Input token is required for 1inch swap' });
      }
      if (!block.params.outputToken || typeof block.params.outputToken !== 'string') {
        errors.push({ blockId: block.id, message: 'Output token is required for 1inch swap' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Swap amount must be greater than 0' });
      }
      if (block.params.inputToken === block.params.outputToken) {
        errors.push({ blockId: block.id, message: 'Input and Output tokens must be different' });
      }
      break;

    case 'flash_loan':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for flash loan' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Flash loan amount must be greater than 0' });
      }
      if (!block.params.protocol || block.params.protocol !== 'aave') {
        errors.push({ blockId: block.id, message: 'Protocol must be "aave" for flash loan' });
      }
      break;

    case 'staking':
      if (!block.params.asset || typeof block.params.asset !== 'string') {
        errors.push({ blockId: block.id, message: 'Asset is required for staking' });
      }
      if (!block.params.amount || Number(block.params.amount) <= 0) {
        errors.push({ blockId: block.id, message: 'Staking amount must be greater than 0' });
      }
      if (
        !block.params.stakingType ||
        !['eth2', 'token', 'liquidity'].includes(String(block.params.stakingType))
      ) {
        errors.push({
          blockId: block.id,
          message: 'Valid staking type (eth2, token, liquidity) is required',
        });
      }
      break;

    case 'take_profit':
      if (!block.params.percentage || Number(block.params.percentage) <= 0) {
        errors.push({
          blockId: block.id,
          message: 'Take profit percentage must be greater than 0',
        });
      }
      if (Number(block.params.percentage) > 1000) {
        errors.push({
          blockId: block.id,
          message: 'Take profit percentage must be less than 1000%',
        });
      }
      break;

    case 'time_exit':
      if (!block.params.duration || Number(block.params.duration) <= 0) {
        errors.push({ blockId: block.id, message: 'Duration must be greater than 0' });
      }
      const fromError = validateEnum(
        String(block.params.from || ''),
        ['entry', 'position'] as const,
        'From'
      );
      if (fromError) {
        errors.push({ blockId: block.id, message: `From must be "entry" or "position": ${fromError}` });
      }
      break;

    case 'conditional_exit':
      if (!block.params.condition || typeof block.params.condition !== 'string') {
        errors.push({ blockId: block.id, message: 'Condition is required for conditional exit' });
      }
      break;

    case 'position_sizing':
      const methodError = validateEnum(
        String(block.params.method || ''),
        ['fixed', 'percentage', 'kelly', 'risk_based'] as const,
        'Method'
      );
      if (methodError) {
        errors.push({
          blockId: block.id,
          message: `Valid method (fixed, percentage, kelly, risk_based) is required: ${methodError}`,
        });
      }
      if (!block.params.value || Number(block.params.value) <= 0) {
        errors.push({ blockId: block.id, message: 'Position sizing value must be greater than 0' });
      }
      break;

    case 'risk_limits':
      if (!block.params.maxDrawdown || Number(block.params.maxDrawdown) <= 0) {
        errors.push({ blockId: block.id, message: 'Max drawdown must be greater than 0' });
      }
      if (Number(block.params.maxDrawdown) > 100) {
        errors.push({ blockId: block.id, message: 'Max drawdown must be less than 100%' });
      }
      if (!block.params.maxPositionSize || Number(block.params.maxPositionSize) <= 0) {
        errors.push({ blockId: block.id, message: 'Max position size must be greater than 0' });
      }
      if (Number(block.params.maxPositionSize) > 100) {
        errors.push({ blockId: block.id, message: 'Max position size must be less than 100%' });
      }
      break;

    case 'rebalancing':
      if (!block.params.targetAllocation || typeof block.params.targetAllocation !== 'object') {
        errors.push({ blockId: block.id, message: 'Target allocation is required' });
      }
      if (!block.params.threshold || Number(block.params.threshold) <= 0) {
        errors.push({ blockId: block.id, message: 'Rebalancing threshold must be greater than 0' });
      }
      const rebalanceMethodError = validateEnum(
        String(block.params.method || ''),
        ['proportional', 'equal'] as const,
        'Rebalancing method'
      );
      if (rebalanceMethodError) {
        errors.push({
          blockId: block.id,
          message: `Rebalancing method must be "proportional" or "equal": ${rebalanceMethodError}`,
        });
      }
      break;

    default:
      // Unknown block type - warn but don't fail
      console.warn(`Unknown block type: ${block.type}`);
      break;
  }
}

/**
 * Validates parameter ranges (e.g., slippage > 100%)
 */
function validateParameterRanges(
  block: LegoBlock,
  errors: { blockId: string; message: string }[]
): void {
  // Validate slippage for swap operations
  if (block.params.slippage !== undefined) {
    const slippage = Number(block.params.slippage);
    if (isNaN(slippage)) {
      errors.push({ blockId: block.id, message: 'Slippage must be a valid number' });
    } else if (slippage < 0) {
      errors.push({ blockId: block.id, message: 'Slippage cannot be negative' });
    } else if (slippage > 100) {
      errors.push({ blockId: block.id, message: 'Slippage cannot exceed 100%' });
    }
  }

  // Validate percentage-based parameters
  if (block.params.percentage !== undefined) {
    const percentage = Number(block.params.percentage);
    if (isNaN(percentage)) {
      errors.push({ blockId: block.id, message: 'Percentage must be a valid number' });
    } else if (percentage < 0 || percentage > 100) {
      errors.push({ blockId: block.id, message: 'Percentage must be between 0 and 100' });
    }
  }

  // Validate amount parameters
  if (block.params.amount !== undefined) {
    const amount = Number(block.params.amount);
    if (isNaN(amount)) {
      errors.push({ blockId: block.id, message: 'Amount must be a valid number' });
    } else if (amount < 0) {
      errors.push({ blockId: block.id, message: 'Amount cannot be negative' });
    }
  }

  // Validate amount0 and amount1 for liquidity blocks
  if (block.params.amount0 !== undefined) {
    const amount = Number(block.params.amount0);
    if (isNaN(amount)) {
      errors.push({ blockId: block.id, message: 'Amount0 must be a valid number' });
    } else if (amount < 0) {
      errors.push({ blockId: block.id, message: 'Amount0 cannot be negative' });
    }
  }

  if (block.params.amount1 !== undefined) {
    const amount = Number(block.params.amount1);
    if (isNaN(amount)) {
      errors.push({ blockId: block.id, message: 'Amount1 must be a valid number' });
    } else if (amount < 0) {
      errors.push({ blockId: block.id, message: 'Amount1 cannot be negative' });
    }
  }

  // Validate duration for time-based blocks
  if (block.params.duration !== undefined) {
    const duration = Number(block.params.duration);
    if (isNaN(duration)) {
      errors.push({ blockId: block.id, message: 'Duration must be a valid number' });
    } else if (duration < 0) {
      errors.push({ blockId: block.id, message: 'Duration cannot be negative' });
    }
  }

  // Validate minVolume for volume trigger
  if (block.params.minVolume !== undefined) {
    const volume = Number(block.params.minVolume);
    if (isNaN(volume)) {
      errors.push({ blockId: block.id, message: 'Minimum volume must be a valid number' });
    } else if (volume < 0) {
      errors.push({ blockId: block.id, message: 'Minimum volume cannot be negative' });
    }
  }
}

/**
 * Validates flow structure: ENTRY → PROTOCOL → EXIT
 */
function validateFlowStructure(
  blocks: LegoBlock[],
  errors: { blockId: string; message: string }[]
): void {
  if (blocks.length === 0) return;

  const categories = blocks.map((b) => b.category);

  // Check if strategy has at least one ENTRY block
  const hasEntry = categories.some((c) => c === BlockCategory.ENTRY);
  if (!hasEntry) {
    errors.push({
      blockId: blocks[0].id,
      message: 'Strategy must start with at least one ENTRY block',
    });
  }

  // Check if strategy has at least one PROTOCOL block
  const hasProtocol = categories.some((c) => c === BlockCategory.PROTOCOL);
  if (!hasProtocol) {
    errors.push({
      blockId: blocks[0].id,
      message: 'Strategy must include at least one PROTOCOL block',
    });
  }

  // Validate flow order: ENTRY should come before PROTOCOL, PROTOCOL before EXIT
  let lastCategory: BlockCategory | null = null;
  blocks.forEach((block, index) => {
    const currentCategory = block.category;

    // ENTRY blocks should come first
    if (
      currentCategory === BlockCategory.ENTRY &&
      lastCategory !== null &&
      lastCategory !== BlockCategory.ENTRY
    ) {
      errors.push({
        blockId: block.id,
        message: 'ENTRY blocks should come before PROTOCOL and EXIT blocks',
      });
    }

    // PROTOCOL blocks should come after ENTRY
    if (currentCategory === BlockCategory.PROTOCOL && lastCategory === BlockCategory.EXIT) {
      errors.push({
        blockId: block.id,
        message: 'PROTOCOL blocks should come before EXIT blocks',
      });
    }

    // EXIT blocks should come after PROTOCOL
    if (currentCategory === BlockCategory.EXIT && lastCategory === BlockCategory.ENTRY) {
      errors.push({
        blockId: block.id,
        message: 'EXIT blocks should come after PROTOCOL blocks',
      });
    }

    lastCategory = currentCategory;
  });
}

/**
 * Validates token compatibility between blocks
 */
function validateTokenCompatibility(
  blocks: LegoBlock[],
  errors: { blockId: string; message: string }[]
): void {
  const tokenFlow: string[] = [];

  blocks.forEach((block, index) => {
    // Track output tokens from previous blocks
    let previousOutputToken: string | null = null;
    if (index > 0) {
      const prevBlock = blocks[index - 1];
      if (prevBlock.type === 'uniswap_swap' && prevBlock.params.outputToken) {
        previousOutputToken = String(prevBlock.params.outputToken);
      } else if (prevBlock.type === 'aave_supply' && prevBlock.params.asset) {
        previousOutputToken = String(prevBlock.params.asset);
      }
    }

    // Check token compatibility for swaps
    if (block.type === 'uniswap_swap') {
      const inputToken = String(block.params.inputToken || '');
      const outputToken = String(block.params.outputToken || '');

      // If previous block had an output, suggest using it
      if (previousOutputToken && inputToken !== previousOutputToken) {
        // This is a warning, not an error - user might intentionally want different tokens
        // But we can suggest compatibility
        if (index > 0) {
          // Only warn if it's clearly incompatible
          const prevBlock = blocks[index - 1];
          if (prevBlock.type === 'uniswap_swap' && prevBlock.params.outputToken !== inputToken) {
            // This is acceptable - user might be doing multi-hop swaps
          }
        }
      }

      // Check for circular swaps (same token in and out)
      if (inputToken === outputToken) {
        errors.push({
          blockId: block.id,
          message: `Cannot swap ${inputToken} to ${outputToken} (same token)`,
        });
      }
    }

    // Check Aave supply compatibility
    if (block.type === 'aave_supply') {
      const asset = String(block.params.asset || '');
      if (previousOutputToken && asset !== previousOutputToken) {
        // Warning: asset doesn't match previous output
        // This might be intentional, so we'll just log it
      }
    }
  });
}

/**
 * Validates dependencies between blocks (e.g., stop loss requires a position)
 */
function validateDependencies(
  blocks: LegoBlock[],
  errors: { blockId: string; message: string }[]
): void {
  blocks.forEach((block, index) => {
    // Stop loss requires a position (PROTOCOL block before it)
    if (block.type === 'stop_loss') {
      const hasPositionBefore = blocks
        .slice(0, index)
        .some((b) => b.category === BlockCategory.PROTOCOL);
      if (!hasPositionBefore) {
        errors.push({
          blockId: block.id,
          message: 'Stop Loss requires a position (PROTOCOL block) before it',
        });
      }
    }

    // Take profit requires a position
    if (block.type === 'take_profit') {
      const hasPositionBefore = blocks
        .slice(0, index)
        .some((b) => b.category === BlockCategory.PROTOCOL);
      if (!hasPositionBefore) {
        errors.push({
          blockId: block.id,
          message: 'Take Profit requires a position (PROTOCOL block) before it',
        });
      }
    }

    // Time exit requires a position
    if (block.type === 'time_exit') {
      const hasPositionBefore = blocks
        .slice(0, index)
        .some((b) => b.category === BlockCategory.PROTOCOL);
      if (!hasPositionBefore) {
        errors.push({
          blockId: block.id,
          message: 'Time Exit requires a position (PROTOCOL block) before it',
        });
      }
    }

    // Conditional exit requires a position
    if (block.type === 'conditional_exit') {
      const hasPositionBefore = blocks
        .slice(0, index)
        .some((b) => b.category === BlockCategory.PROTOCOL);
      if (!hasPositionBefore) {
        errors.push({
          blockId: block.id,
          message: 'Conditional Exit requires a position (PROTOCOL block) before it',
        });
      }
    }

    // Aave borrow requires supply first
    if (block.type === 'aave_borrow') {
      const hasSupplyBefore = blocks.slice(0, index).some((b) => b.type === 'aave_supply');
      if (!hasSupplyBefore) {
        errors.push({
          blockId: block.id,
          message: 'Aave Borrow requires Aave Supply before it (for collateral)',
        });
      }
    }

    // Aave repay requires borrow first
    if (block.type === 'aave_repay') {
      const hasBorrowBefore = blocks.slice(0, index).some((b) => b.type === 'aave_borrow');
      if (!hasBorrowBefore) {
        errors.push({
          blockId: block.id,
          message: 'Aave Repay requires Aave Borrow before it',
        });
      }
    }

    // Aave withdraw requires supply first
    if (block.type === 'aave_withdraw') {
      const hasSupplyBefore = blocks.slice(0, index).some((b) => b.type === 'aave_supply');
      if (!hasSupplyBefore) {
        errors.push({
          blockId: block.id,
          message: 'Aave Withdraw requires Aave Supply before it',
        });
      }
    }

    // Compound borrow requires supply first
    if (block.type === 'compound_borrow') {
      const hasSupplyBefore = blocks.slice(0, index).some((b) => b.type === 'compound_supply');
      if (!hasSupplyBefore) {
        errors.push({
          blockId: block.id,
          message: 'Compound Borrow requires Compound Supply before it (for collateral)',
        });
      }
    }

    // Flash loan must be repaid in same transaction (simplified check)
    if (block.type === 'flash_loan') {
      // In real implementation, would check that repay happens in same transaction
      // For now, just warn that it needs to be handled carefully
    }

    // Exit blocks should have something to exit (PROTOCOL block before)
    if (block.category === BlockCategory.EXIT) {
      const hasProtocolBefore = blocks
        .slice(0, index)
        .some((b) => b.category === BlockCategory.PROTOCOL);
      if (!hasProtocolBefore) {
        errors.push({
          blockId: block.id,
          message: 'EXIT blocks require a PROTOCOL block before them',
        });
      }
    }

    // Risk blocks should come after ENTRY but can be anywhere
    // Position sizing should come before protocol blocks that use it
    if (block.type === 'position_sizing') {
      // Position sizing affects subsequent blocks, so it's fine anywhere
      // But ideally should come before protocol blocks
    }
  });
}
