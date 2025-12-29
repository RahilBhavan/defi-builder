/**
 * Block execution engine for backtesting
 * Executes each block type with real logic
 */

import { LegoBlock } from '../../types';
import { PortfolioManager, Trade } from './portfolio';
import { PriceDataPoint, getPriceAtTimestamp } from './dataFetcher';

export interface ExecutionContext {
  timestamp: number;
  prices: Map<string, number>; // token -> current price
  portfolio: PortfolioManager;
  previousResults: Map<string, unknown>; // blockId -> execution result
}

export interface ExecutionResult {
  success: boolean;
  executed: boolean;
  message?: string;
  data?: unknown;
}

// Gas costs (in ETH, approximate)
const GAS_COSTS = {
  swap: 0.001, // ~150k gas at 20 gwei
  supply: 0.0015, // ~200k gas
  withdraw: 0.001,
  trigger: 0, // No on-chain transaction
  stopLoss: 0.0005, // Exit transaction
};

// Protocol fees
const PROTOCOL_FEES = {
  uniswap: 0.003, // 0.3% swap fee
  aave: 0, // No fee for supply (earns interest instead)
};

/**
 * Execute a price trigger block
 */
function executePriceTrigger(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  const { asset, targetPrice, condition } = block.params;
  const currentPrice = context.prices.get(String(asset)) || 0;
  const target = Number(targetPrice) || 0;

  if (!asset || !targetPrice) {
    return {
      success: false,
      executed: false,
      message: 'Missing required parameters: asset, targetPrice',
    };
  }

  let conditionMet = false;
  switch (condition) {
    case '>=':
      conditionMet = currentPrice >= target;
      break;
    case '<=':
      conditionMet = currentPrice <= target;
      break;
    case '>':
      conditionMet = currentPrice > target;
      break;
    case '<':
      conditionMet = currentPrice < target;
      break;
    case '==':
      conditionMet = Math.abs(currentPrice - target) < 0.01; // Small tolerance
      break;
    default:
      return {
        success: false,
        executed: false,
        message: `Invalid condition: ${condition}`,
      };
  }

  return {
    success: true,
    executed: conditionMet,
    message: conditionMet
      ? `Price trigger met: ${asset} ${condition} ${target}`
      : `Price trigger not met: ${asset} = ${currentPrice.toFixed(2)}`,
    data: { currentPrice, targetPrice: target, conditionMet },
  };
}

/**
 * Execute a Uniswap swap block
 */
function executeUniswapSwap(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  const { inputToken, outputToken, amount, slippage } = block.params;
  const input = String(inputToken);
  const output = String(outputToken);
  const inputAmount = Number(amount) || 0;
  const slippageTolerance = Number(slippage) || 0.5; // Default 0.5%

  if (!inputToken || !outputToken || inputAmount <= 0) {
    return {
      success: false,
      executed: false,
      message: 'Missing or invalid swap parameters',
    };
  }

  // Check balance
  const balance = context.portfolio.getBalance(input);
  if (balance < inputAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${input}. Have ${balance}, need ${inputAmount}`,
    };
  }

  // Get prices
  const inputPrice = context.prices.get(input) || 0;
  const outputPrice = context.prices.get(output) || 0;

  if (inputPrice === 0 || outputPrice === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data for ${input} or ${output}`,
    };
  }

  // Calculate output using constant product formula (simplified)
  // For simplicity, we use price ratio (real Uniswap uses reserves)
  const priceRatio = inputPrice / outputPrice;
  let outputAmount = inputAmount * priceRatio;

  // Apply slippage
  const slippageAmount = outputAmount * (slippageTolerance / 100);
  outputAmount = outputAmount - slippageAmount;

  // Calculate fees (0.3% Uniswap fee)
  const feeAmount = inputAmount * PROTOCOL_FEES.uniswap;
  const inputAfterFee = inputAmount - feeAmount;
  outputAmount = inputAfterFee * priceRatio - slippageAmount;

  // Execute swap
  try {
    context.portfolio.subtractBalance(input, inputAmount);
    context.portfolio.addBalance(output, outputAmount);

    // Record trade
    const gasCost = GAS_COSTS.swap * inputPrice; // Convert to USD
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'swap',
      inputToken: input,
      outputToken: output,
      inputAmount,
      outputAmount,
      price: outputPrice,
      slippage: slippageTolerance,
      fees: feeAmount * inputPrice,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Swapped ${inputAmount} ${input} for ${outputAmount.toFixed(4)} ${output}`,
      data: { inputAmount, outputAmount, fees: feeAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Swap execution failed',
    };
  }
}

/**
 * Execute an Aave supply block
 */
function executeAaveSupply(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  const { asset, amount, collateral } = block.params;
  const token = String(asset);
  const supplyAmount = Number(amount) || 0;

  if (!asset || supplyAmount <= 0) {
    return {
      success: false,
      executed: false,
      message: 'Missing or invalid supply parameters',
    };
  }

  // Check balance
  const balance = context.portfolio.getBalance(token);
  if (balance < supplyAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${token}. Have ${balance}, need ${supplyAmount}`,
    };
  }

  // Get price
  const price = context.prices.get(token) || 0;
  if (price === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data for ${token}`,
    };
  }

  try {
    // Move from balance to position
    context.portfolio.subtractBalance(token, supplyAmount);

    // Add position (will earn interest over time)
    context.portfolio.addPosition({
      type: 'supply',
      asset: token,
      amount: supplyAmount,
      entryPrice: price,
      entryTimestamp: context.timestamp,
      protocol: 'Aave',
    });

    // Record trade
    const gasCost = GAS_COSTS.supply * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'supply',
      inputToken: token,
      inputAmount: supplyAmount,
      price,
      fees: 0, // Aave doesn't charge fees for supply
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Supplied ${supplyAmount} ${token} to Aave`,
      data: { amount: supplyAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Supply execution failed',
    };
  }
}

/**
 * Execute a stop loss block
 */
function executeStopLoss(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  const { percentage } = block.params;
  const maxDrawdown = Number(percentage) || 10; // Default 10%

  // Calculate current drawdown
  const positions = context.portfolio.getPositions();
  if (positions.length === 0) {
    return {
      success: true,
      executed: false,
      message: 'No positions to check for stop loss',
    };
  }

  let shouldExit = false;
  const exits: string[] = [];

  for (const position of positions) {
    const currentPrice = context.prices.get(position.asset) || 0;
    if (currentPrice === 0) continue;

    const entryValue = position.amount * position.entryPrice;
    const currentValue = position.amount * currentPrice;
    const drawdown = ((entryValue - currentValue) / entryValue) * 100;

    if (drawdown >= maxDrawdown) {
      shouldExit = true;
      
      // Exit position
      context.portfolio.removePosition(position.id);
      context.portfolio.addBalance(position.asset, position.amount);

      // Record exit trade
      const gasCost = GAS_COSTS.stopLoss * currentPrice;
      context.portfolio.recordTrade({
        timestamp: context.timestamp,
        type: 'exit',
        inputToken: position.asset,
        inputAmount: position.amount,
        price: currentPrice,
        fees: 0,
        gasCost,
      });

      exits.push(position.asset);
    }
  }

  return {
    success: true,
    executed: shouldExit,
    message: shouldExit
      ? `Stop loss triggered: Exited positions in ${exits.join(', ')}`
      : `Stop loss not triggered (max drawdown: ${maxDrawdown}%)`,
    data: { exits, maxDrawdown },
  };
}

/**
 * Execute a block based on its type
 */
export function executeBlock(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  switch (block.type) {
    case 'price_trigger':
      return executePriceTrigger(block, context);

    case 'uniswap_swap':
      return executeUniswapSwap(block, context);

    case 'aave_supply':
      return executeAaveSupply(block, context);

    case 'stop_loss':
      return executeStopLoss(block, context);

    default:
      return {
        success: false,
        executed: false,
        message: `Unknown block type: ${block.type}`,
      };
  }
}

/**
 * Execute a sequence of blocks
 */
export function executeBlockSequence(
  blocks: LegoBlock[],
  context: ExecutionContext
): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  for (const block of blocks) {
    // Check if previous block executed (for conditional blocks)
    if (block.category === 'PROTOCOL' || block.category === 'EXIT') {
      const previousResult = results[results.length - 1];
      if (previousResult && !previousResult.executed) {
        // Skip if previous entry/trigger didn't execute
        results.push({
          success: true,
          executed: false,
          message: `Skipped ${block.label}: Previous condition not met`,
        });
        continue;
      }
    }

    const result = executeBlock(block, context);
    results.push(result);

    // Store result for next blocks
    context.previousResults.set(block.id, result);
  }

  return results;
}

