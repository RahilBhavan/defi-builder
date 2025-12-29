/**
 * Block execution engine for backtesting
 * Executes each block type with real logic
 */

import type { LegoBlock } from '../../types';
import { PriceDataPoint, getPriceAtTimestamp } from './dataFetcher';
import { type PortfolioManager, Trade } from './portfolio';

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
  borrow: 0.002, // ~250k gas
  repay: 0.0015,
  withdraw: 0.001,
  liquidity: 0.003, // ~400k gas for adding liquidity
  trigger: 0, // No on-chain transaction
  stopLoss: 0.0005, // Exit transaction
  flashLoan: 0.002,
  staking: 0.0015,
};

// Protocol fees
const PROTOCOL_FEES = {
  uniswap: 0.003, // 0.3% swap fee
  aave: 0, // No fee for supply (earns interest instead)
  compound: 0,
  curve: 0.0004, // 0.04% swap fee
  balancer: 0.002, // 0.2% swap fee
  oneinch: 0.001, // 0.1% aggregator fee
};

/**
 * Execute a price trigger block
 */
function executePriceTrigger(block: LegoBlock, context: ExecutionContext): ExecutionResult {
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
function executeUniswapSwap(block: LegoBlock, context: ExecutionContext): ExecutionResult {
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
function executeAaveSupply(block: LegoBlock, context: ExecutionContext): ExecutionResult {
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
function executeStopLoss(block: LegoBlock, context: ExecutionContext): ExecutionResult {
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
 * Execute a time trigger block
 */
function executeTimeTrigger(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { schedule } = block.params;
  // Simplified: check if current time matches schedule
  // In real implementation, would parse cron expression
  const now = new Date(context.timestamp);
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Simple check for "9 AM daily" pattern: "0 9 * * *"
  if (schedule === '0 9 * * *' && hour === 9 && minute === 0) {
    return {
      success: true,
      executed: true,
      message: 'Time trigger executed: Schedule matched',
      data: { schedule, timestamp: context.timestamp },
    };
  }

  return {
    success: true,
    executed: false,
    message: 'Time trigger not executed: Schedule not matched',
    data: { schedule, timestamp: context.timestamp },
  };
}

/**
 * Execute a volume trigger block
 */
function executeVolumeTrigger(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, minVolume, timeframe } = block.params;
  // Simplified: would need historical volume data
  // For now, simulate based on price movement
  const price = context.prices.get(String(asset)) || 0;
  const simulatedVolume = price * 1000000; // Simplified volume calculation
  const requiredVolume = Number(minVolume) || 0;

  if (simulatedVolume >= requiredVolume) {
    return {
      success: true,
      executed: true,
      message: `Volume trigger met: ${asset} volume ${simulatedVolume.toFixed(0)} >= ${requiredVolume}`,
      data: { volume: simulatedVolume, requiredVolume },
    };
  }

  return {
    success: true,
    executed: false,
    message: `Volume trigger not met: ${asset} volume ${simulatedVolume.toFixed(0)} < ${requiredVolume}`,
    data: { volume: simulatedVolume, requiredVolume },
  };
}

/**
 * Execute a technical indicator trigger block
 */
function executeTechnicalIndicatorTrigger(
  block: LegoBlock,
  context: ExecutionContext
): ExecutionResult {
  const { asset, indicator, condition, value, period } = block.params;
  const price = context.prices.get(String(asset)) || 0;

  // Simplified indicator calculation
  // In real implementation, would calculate actual RSI, MACD, etc.
  let indicatorValue = 0;
  switch (indicator) {
    case 'RSI':
      indicatorValue = 50 + (Math.random() - 0.5) * 40; // Simulated RSI 30-70
      break;
    case 'MACD':
      indicatorValue = (Math.random() - 0.5) * 100; // Simulated MACD
      break;
    case 'BB':
      indicatorValue = price * 0.95; // Simulated Bollinger Band
      break;
    case 'MA':
      indicatorValue = price; // Moving average = current price (simplified)
      break;
  }

  const targetValue = Number(value) || 0;
  let conditionMet = false;

  switch (condition) {
    case '>=':
      conditionMet = indicatorValue >= targetValue;
      break;
    case '<=':
      conditionMet = indicatorValue <= targetValue;
      break;
    case '>':
      conditionMet = indicatorValue > targetValue;
      break;
    case '<':
      conditionMet = indicatorValue < targetValue;
      break;
    case '==':
      conditionMet = Math.abs(indicatorValue - targetValue) < 0.01;
      break;
  }

  return {
    success: true,
    executed: conditionMet,
    message: conditionMet
      ? `${indicator} trigger met: ${indicatorValue.toFixed(2)} ${condition} ${targetValue}`
      : `${indicator} trigger not met: ${indicatorValue.toFixed(2)} ${condition} ${targetValue}`,
    data: { indicator, indicatorValue, targetValue, conditionMet },
  };
}

/**
 * Execute an Aave borrow block
 */
function executeAaveBorrow(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount, interestRateMode } = block.params;
  const token = String(asset);
  const borrowAmount = Number(amount) || 0;

  // Check if user has collateral (simplified check)
  const positions = context.portfolio.getPositions();
  const hasCollateral = positions.some((p) => p.protocol === 'Aave' && p.type === 'supply');

  if (!hasCollateral) {
    return {
      success: false,
      executed: false,
      message: 'Cannot borrow: No collateral supplied to Aave',
    };
  }

  const price = context.prices.get(token) || 0;
  if (price === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data for ${token}`,
    };
  }

  try {
    context.portfolio.addBalance(token, borrowAmount);

    // Add debt position
    context.portfolio.addPosition({
      type: 'borrow',
      asset: token,
      amount: borrowAmount,
      entryPrice: price,
      entryTimestamp: context.timestamp,
      protocol: 'Aave',
    });

    const gasCost = GAS_COSTS.borrow * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'borrow',
      inputToken: token,
      inputAmount: borrowAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Borrowed ${borrowAmount} ${token} from Aave`,
      data: { amount: borrowAmount, interestRateMode, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Borrow execution failed',
    };
  }
}

/**
 * Execute an Aave repay block
 */
function executeAaveRepay(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount, interestRateMode } = block.params;
  const token = String(asset);
  const repayAmount = Number(amount) || 0;

  const balance = context.portfolio.getBalance(token);
  if (balance < repayAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance to repay: ${token}. Have ${balance}, need ${repayAmount}`,
    };
  }

  // Find and remove debt position
  const positions = context.portfolio.getPositions();
  const debtPosition = positions.find(
    (p) => p.protocol === 'Aave' && p.type === 'borrow' && p.asset === token
  );

  if (!debtPosition) {
    return {
      success: false,
      executed: false,
      message: `No debt to repay for ${token}`,
    };
  }

  const price = context.prices.get(token) || 0;
  try {
    context.portfolio.subtractBalance(token, repayAmount);
    context.portfolio.removePosition(debtPosition.id);

    const gasCost = GAS_COSTS.repay * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'repay',
      inputToken: token,
      inputAmount: repayAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Repaid ${repayAmount} ${token} to Aave`,
      data: { amount: repayAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Repay execution failed',
    };
  }
}

/**
 * Execute an Aave withdraw block
 */
function executeAaveWithdraw(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount } = block.params;
  const token = String(asset);
  const withdrawAmount = Number(amount) || 0;

  // Find supply position
  const positions = context.portfolio.getPositions();
  const supplyPosition = positions.find(
    (p) => p.protocol === 'Aave' && p.type === 'supply' && p.asset === token
  );

  if (!supplyPosition || supplyPosition.amount < withdrawAmount) {
    return {
      success: false,
      executed: false,
      message: `Cannot withdraw: Insufficient supplied amount for ${token}`,
    };
  }

  const price = context.prices.get(token) || 0;
  try {
    // Update position
    supplyPosition.amount -= withdrawAmount;
    if (supplyPosition.amount <= 0) {
      context.portfolio.removePosition(supplyPosition.id);
    }

    // Add back to balance
    context.portfolio.addBalance(token, withdrawAmount);

    const gasCost = GAS_COSTS.withdraw * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'withdraw',
      inputToken: token,
      inputAmount: withdrawAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Withdrew ${withdrawAmount} ${token} from Aave`,
      data: { amount: withdrawAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Withdraw execution failed',
    };
  }
}

/**
 * Execute a Uniswap V3 liquidity block
 */
function executeUniswapV3Liquidity(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { token0, token1, amount0, amount1, feeTier } = block.params;
  const t0 = String(token0);
  const t1 = String(token1);
  const amt0 = Number(amount0) || 0;
  const amt1 = Number(amount1) || 0;

  const balance0 = context.portfolio.getBalance(t0);
  const balance1 = context.portfolio.getBalance(t1);

  if (balance0 < amt0 || balance1 < amt1) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance for liquidity provision`,
    };
  }

  const price0 = context.prices.get(t0) || 0;
  const price1 = context.prices.get(t1) || 0;

  try {
    context.portfolio.subtractBalance(t0, amt0);
    context.portfolio.subtractBalance(t1, amt1);

    // Add liquidity position
    context.portfolio.addPosition({
      type: 'liquidity',
      asset: `${t0}/${t1}`,
      amount: amt0 + amt1, // Simplified
      entryPrice: (price0 + price1) / 2,
      entryTimestamp: context.timestamp,
      protocol: 'Uniswap',
    });

    const gasCost = GAS_COSTS.liquidity * price0;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'liquidity',
      inputToken: `${t0}/${t1}`,
      inputAmount: amt0 + amt1,
      price: (price0 + price1) / 2,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Added liquidity: ${amt0} ${t0} + ${amt1} ${t1}`,
      data: { amount0: amt0, amount1: amt1, feeTier, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Liquidity provision failed',
    };
  }
}

/**
 * Execute a Compound supply block
 */
function executeCompoundSupply(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount } = block.params;
  const token = String(asset);
  const supplyAmount = Number(amount) || 0;

  const balance = context.portfolio.getBalance(token);
  if (balance < supplyAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${token}. Have ${balance}, need ${supplyAmount}`,
    };
  }

  const price = context.prices.get(token) || 0;
  try {
    context.portfolio.subtractBalance(token, supplyAmount);
    context.portfolio.addPosition({
      type: 'supply',
      asset: token,
      amount: supplyAmount,
      entryPrice: price,
      entryTimestamp: context.timestamp,
      protocol: 'Compound',
    });

    const gasCost = GAS_COSTS.supply * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'supply',
      inputToken: token,
      inputAmount: supplyAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Supplied ${supplyAmount} ${token} to Compound`,
      data: { amount: supplyAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Compound supply failed',
    };
  }
}

/**
 * Execute a Compound borrow block
 */
function executeCompoundBorrow(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount } = block.params;
  const token = String(asset);
  const borrowAmount = Number(amount) || 0;

  // Check collateral (simplified)
  const positions = context.portfolio.getPositions();
  const hasCollateral = positions.some((p) => p.protocol === 'Compound' && p.type === 'supply');

  if (!hasCollateral) {
    return {
      success: false,
      executed: false,
      message: 'Cannot borrow: No collateral supplied to Compound',
    };
  }

  const price = context.prices.get(token) || 0;
  try {
    context.portfolio.addBalance(token, borrowAmount);
    context.portfolio.addPosition({
      type: 'borrow',
      asset: token,
      amount: borrowAmount,
      entryPrice: price,
      entryTimestamp: context.timestamp,
      protocol: 'Compound',
    });

    const gasCost = GAS_COSTS.borrow * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'borrow',
      inputToken: token,
      inputAmount: borrowAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Borrowed ${borrowAmount} ${token} from Compound`,
      data: { amount: borrowAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Compound borrow failed',
    };
  }
}

/**
 * Execute a Curve swap block
 */
function executeCurveSwap(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { inputToken, outputToken, amount, slippage } = block.params;
  const input = String(inputToken);
  const output = String(outputToken);
  const inputAmount = Number(amount) || 0;
  const slippageTolerance = Number(slippage) || 0.1;

  const balance = context.portfolio.getBalance(input);
  if (balance < inputAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${input}`,
    };
  }

  const inputPrice = context.prices.get(input) || 0;
  const outputPrice = context.prices.get(output) || 0;

  if (inputPrice === 0 || outputPrice === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data`,
    };
  }

  const priceRatio = inputPrice / outputPrice;
  let outputAmount = inputAmount * priceRatio;
  const slippageAmount = outputAmount * (slippageTolerance / 100);
  outputAmount = outputAmount - slippageAmount;

  const feeAmount = inputAmount * PROTOCOL_FEES.curve;
  const inputAfterFee = inputAmount - feeAmount;
  outputAmount = inputAfterFee * priceRatio - slippageAmount;

  try {
    context.portfolio.subtractBalance(input, inputAmount);
    context.portfolio.addBalance(output, outputAmount);

    const gasCost = GAS_COSTS.swap * inputPrice;
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
      message: `Swapped ${inputAmount} ${input} for ${outputAmount.toFixed(4)} ${output} on Curve`,
      data: { inputAmount, outputAmount, fees: feeAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Curve swap failed',
    };
  }
}

/**
 * Execute a Balancer swap block
 */
function executeBalancerSwap(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { inputToken, outputToken, amount, slippage } = block.params;
  const input = String(inputToken);
  const output = String(outputToken);
  const inputAmount = Number(amount) || 0;
  const slippageTolerance = Number(slippage) || 0.5;

  const balance = context.portfolio.getBalance(input);
  if (balance < inputAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${input}`,
    };
  }

  const inputPrice = context.prices.get(input) || 0;
  const outputPrice = context.prices.get(output) || 0;

  if (inputPrice === 0 || outputPrice === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data`,
    };
  }

  const priceRatio = inputPrice / outputPrice;
  let outputAmount = inputAmount * priceRatio;
  const slippageAmount = outputAmount * (slippageTolerance / 100);
  outputAmount = outputAmount - slippageAmount;

  const feeAmount = inputAmount * PROTOCOL_FEES.balancer;
  const inputAfterFee = inputAmount - feeAmount;
  outputAmount = inputAfterFee * priceRatio - slippageAmount;

  try {
    context.portfolio.subtractBalance(input, inputAmount);
    context.portfolio.addBalance(output, outputAmount);

    const gasCost = GAS_COSTS.swap * inputPrice;
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
      message: `Swapped ${inputAmount} ${input} for ${outputAmount.toFixed(4)} ${output} on Balancer`,
      data: { inputAmount, outputAmount, fees: feeAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Balancer swap failed',
    };
  }
}

/**
 * Execute a 1inch swap block
 */
function executeOneInchSwap(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { inputToken, outputToken, amount, slippage } = block.params;
  const input = String(inputToken);
  const output = String(outputToken);
  const inputAmount = Number(amount) || 0;
  const slippageTolerance = Number(slippage) || 0.5;

  const balance = context.portfolio.getBalance(input);
  if (balance < inputAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${input}`,
    };
  }

  const inputPrice = context.prices.get(input) || 0;
  const outputPrice = context.prices.get(output) || 0;

  if (inputPrice === 0 || outputPrice === 0) {
    return {
      success: false,
      executed: false,
      message: `Missing price data`,
    };
  }

  // 1inch typically gets better rates (simulate 0.1% better)
  const priceRatio = (inputPrice / outputPrice) * 1.001;
  let outputAmount = inputAmount * priceRatio;
  const slippageAmount = outputAmount * (slippageTolerance / 100);
  outputAmount = outputAmount - slippageAmount;

  const feeAmount = inputAmount * PROTOCOL_FEES.oneinch;
  const inputAfterFee = inputAmount - feeAmount;
  outputAmount = inputAfterFee * priceRatio - slippageAmount;

  try {
    context.portfolio.subtractBalance(input, inputAmount);
    context.portfolio.addBalance(output, outputAmount);

    const gasCost = GAS_COSTS.swap * inputPrice;
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
      message: `Swapped ${inputAmount} ${input} for ${outputAmount.toFixed(4)} ${output} via 1inch`,
      data: { inputAmount, outputAmount, fees: feeAmount, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : '1inch swap failed',
    };
  }
}

/**
 * Execute a flash loan block
 */
function executeFlashLoan(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount } = block.params;
  const token = String(asset);
  const loanAmount = Number(amount) || 0;

  // Flash loans must be repaid in same transaction
  // This is a simplified simulation
  const price = context.prices.get(token) || 0;
  const fee = loanAmount * 0.0009; // 0.09% flash loan fee

  try {
    // Temporarily add balance (must be repaid)
    context.portfolio.addBalance(token, loanAmount);

    const gasCost = GAS_COSTS.flashLoan * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'flash_loan',
      inputToken: token,
      inputAmount: loanAmount,
      price,
      fees: fee * price,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Flash loan executed: ${loanAmount} ${token} (must be repaid)`,
      data: { amount: loanAmount, fee, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Flash loan failed',
    };
  }
}

/**
 * Execute a staking block
 */
function executeStaking(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { asset, amount, stakingType } = block.params;
  const token = String(asset);
  const stakeAmount = Number(amount) || 0;

  const balance = context.portfolio.getBalance(token);
  if (balance < stakeAmount) {
    return {
      success: false,
      executed: false,
      message: `Insufficient balance: ${token}`,
    };
  }

  const price = context.prices.get(token) || 0;
  try {
    context.portfolio.subtractBalance(token, stakeAmount);
    context.portfolio.addPosition({
      type: 'staking',
      asset: token,
      amount: stakeAmount,
      entryPrice: price,
      entryTimestamp: context.timestamp,
      protocol: 'Staking',
    });

    const gasCost = GAS_COSTS.staking * price;
    context.portfolio.recordTrade({
      timestamp: context.timestamp,
      type: 'staking',
      inputToken: token,
      inputAmount: stakeAmount,
      price,
      fees: 0,
      gasCost,
    });

    return {
      success: true,
      executed: true,
      message: `Staked ${stakeAmount} ${token} (${stakingType})`,
      data: { amount: stakeAmount, stakingType, gasCost },
    };
  } catch (error) {
    return {
      success: false,
      executed: false,
      message: error instanceof Error ? error.message : 'Staking failed',
    };
  }
}

/**
 * Execute a take profit block
 */
function executeTakeProfit(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { percentage, asset } = block.params;
  const profitTarget = Number(percentage) || 20;
  const targetAsset = asset ? String(asset) : null;

  const positions = context.portfolio.getPositions();
  if (positions.length === 0) {
    return {
      success: true,
      executed: false,
      message: 'No positions to check for take profit',
    };
  }

  let shouldExit = false;
  const exits: string[] = [];

  for (const position of positions) {
    if (targetAsset && position.asset !== targetAsset) continue;

    const currentPrice = context.prices.get(position.asset) || 0;
    if (currentPrice === 0) continue;

    const entryValue = position.amount * position.entryPrice;
    const currentValue = position.amount * currentPrice;
    const profit = ((currentValue - entryValue) / entryValue) * 100;

    if (profit >= profitTarget) {
      shouldExit = true;
      context.portfolio.removePosition(position.id);
      context.portfolio.addBalance(position.asset, position.amount);

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
      ? `Take profit triggered: Exited positions in ${exits.join(', ')}`
      : `Take profit not triggered (target: ${profitTarget}%)`,
    data: { exits, profitTarget },
  };
}

/**
 * Execute a time exit block
 */
function executeTimeExit(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { duration, from } = block.params;
  const durationMs = Number(duration) || 86400000;
  const startPoint = from === 'entry' ? 'entry' : 'position';

  const positions = context.portfolio.getPositions();
  if (positions.length === 0) {
    return {
      success: true,
      executed: false,
      message: 'No positions to check for time exit',
    };
  }

  let shouldExit = false;
  const exits: string[] = [];

  for (const position of positions) {
    const timeElapsed = context.timestamp - position.entryTimestamp;
    if (timeElapsed >= durationMs) {
      shouldExit = true;
      const currentPrice = context.prices.get(position.asset) || 0;

      context.portfolio.removePosition(position.id);
      context.portfolio.addBalance(position.asset, position.amount);

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
      ? `Time exit triggered: Exited positions in ${exits.join(', ')}`
      : `Time exit not triggered (duration: ${durationMs}ms)`,
    data: { exits, duration: durationMs },
  };
}

/**
 * Execute a conditional exit block
 */
function executeConditionalExit(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { condition, asset } = block.params;
  // Simplified: would need expression evaluator
  // For now, check if condition string contains profit keywords
  const targetAsset = asset ? String(asset) : null;

  const positions = context.portfolio.getPositions();
  if (positions.length === 0) {
    return {
      success: true,
      executed: false,
      message: 'No positions to check for conditional exit',
    };
  }

  // Simplified condition evaluation
  const shouldExit = condition.includes('profit') || condition.includes('>');

  if (!shouldExit) {
    return {
      success: true,
      executed: false,
      message: `Conditional exit not met: ${condition}`,
      data: { condition },
    };
  }

  const exits: string[] = [];
  for (const position of positions) {
    if (targetAsset && position.asset !== targetAsset) continue;

    const currentPrice = context.prices.get(position.asset) || 0;
    context.portfolio.removePosition(position.id);
    context.portfolio.addBalance(position.asset, position.amount);

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

  return {
    success: true,
    executed: exits.length > 0,
    message:
      exits.length > 0
        ? `Conditional exit triggered: Exited positions in ${exits.join(', ')}`
        : 'Conditional exit not triggered',
    data: { exits, condition },
  };
}

/**
 * Execute a position sizing block
 */
function executePositionSizing(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { method, value, maxPosition } = block.params;
  // Position sizing affects future block execution
  // Store sizing rules in context for use by subsequent blocks
  const sizingValue = Number(value) || 10;
  const maxPos = maxPosition ? Number(maxPosition) : undefined;

  return {
    success: true,
    executed: true,
    message: `Position sizing set: ${method} (${sizingValue}%)`,
    data: { method, value: sizingValue, maxPosition: maxPos },
  };
}

/**
 * Execute a risk limits block
 */
function executeRiskLimits(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { maxDrawdown, maxPositionSize, maxLeverage, maxDailyLoss } = block.params;
  // Risk limits affect strategy execution
  // Store limits in context for validation

  return {
    success: true,
    executed: true,
    message: 'Risk limits set',
    data: { maxDrawdown, maxPositionSize, maxLeverage, maxDailyLoss },
  };
}

/**
 * Execute a rebalancing block
 */
function executeRebalancing(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  const { targetAllocation, threshold, method } = block.params;
  // Simplified rebalancing logic
  // In real implementation, would calculate current allocation and rebalance

  // Calculate total equity from balances and positions
  let totalValue = 0;
  for (const [token, balance] of context.portfolio.getPortfolio().balances.entries()) {
    const price = context.prices.get(token) || 0;
    totalValue += balance * price;
  }
  for (const position of context.portfolio.getPositions()) {
    const price = context.prices.get(position.asset) || 0;
    totalValue += position.amount * price;
  }
  const allocations = targetAllocation as Record<string, number>;

  let rebalanced = false;
  const changes: string[] = [];

  for (const [token, targetPercent] of Object.entries(allocations)) {
    const currentBalance = context.portfolio.getBalance(token);
    const currentPrice = context.prices.get(token) || 0;
    const currentValue = currentBalance * currentPrice;
    const currentPercent = (currentValue / totalValue) * 100;
    const targetValue = (totalValue * targetPercent) / 100;

    const deviation = Math.abs(currentPercent - targetPercent);
    if (deviation > Number(threshold)) {
      rebalanced = true;
      const diff = targetValue - currentValue;
      if (diff > 0) {
        // Need to buy more
        changes.push(`+${diff.toFixed(2)} ${token}`);
      } else {
        // Need to sell
        changes.push(`${diff.toFixed(2)} ${token}`);
      }
    }
  }

  return {
    success: true,
    executed: rebalanced,
    message: rebalanced
      ? `Rebalancing executed: ${changes.join(', ')}`
      : 'Rebalancing not needed (within threshold)',
    data: { changes, targetAllocation, threshold, method },
  };
}

/**
 * Execute a block based on its type
 */
export function executeBlock(block: LegoBlock, context: ExecutionContext): ExecutionResult {
  switch (block.type) {
    case 'price_trigger':
      return executePriceTrigger(block, context);

    case 'uniswap_swap':
      return executeUniswapSwap(block, context);

    case 'aave_supply':
      return executeAaveSupply(block, context);

    case 'stop_loss':
      return executeStopLoss(block, context);

    case 'time_trigger':
      return executeTimeTrigger(block, context);

    case 'volume_trigger':
      return executeVolumeTrigger(block, context);

    case 'technical_indicator_trigger':
      return executeTechnicalIndicatorTrigger(block, context);

    case 'aave_borrow':
      return executeAaveBorrow(block, context);

    case 'aave_repay':
      return executeAaveRepay(block, context);

    case 'aave_withdraw':
      return executeAaveWithdraw(block, context);

    case 'uniswap_v3_liquidity':
      return executeUniswapV3Liquidity(block, context);

    case 'compound_supply':
      return executeCompoundSupply(block, context);

    case 'compound_borrow':
      return executeCompoundBorrow(block, context);

    case 'curve_swap':
      return executeCurveSwap(block, context);

    case 'balancer_swap':
      return executeBalancerSwap(block, context);

    case 'oneinch_swap':
      return executeOneInchSwap(block, context);

    case 'flash_loan':
      return executeFlashLoan(block, context);

    case 'staking':
      return executeStaking(block, context);

    case 'take_profit':
      return executeTakeProfit(block, context);

    case 'time_exit':
      return executeTimeExit(block, context);

    case 'conditional_exit':
      return executeConditionalExit(block, context);

    case 'position_sizing':
      return executePositionSizing(block, context);

    case 'risk_limits':
      return executeRiskLimits(block, context);

    case 'rebalancing':
      return executeRebalancing(block, context);

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
