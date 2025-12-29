/**
 * Zod schemas for runtime validation of block parameters
 * Provides type-safe parsing and validation
 */

import { z } from 'zod';
import { BlockCategory, Protocol } from '../types';

/**
 * Base block schema
 */
const BaseBlockSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  label: z.string().min(1),
  description: z.string(),
  category: z.nativeEnum(BlockCategory),
  protocol: z.nativeEnum(Protocol),
  icon: z.string(),
});

/**
 * Price Trigger Block Schema
 */
export const PriceTriggerParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  targetPrice: z.number().positive('Target price must be positive'),
  condition: z.enum(['>=', '<=', '>', '<', '=='], {
    errorMap: () => ({ message: 'Condition must be one of: >=, <=, >, <, ==' }),
  }),
});

export const PriceTriggerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('price_trigger'),
  params: PriceTriggerParamsSchema,
});

/**
 * Uniswap Swap Block Schema
 */
export const UniswapSwapParamsSchema = z.object({
  inputToken: z.string().min(1, 'Input token is required'),
  outputToken: z.string().min(1, 'Output token is required'),
  amount: z.number().positive('Amount must be positive'),
  slippage: z.number().min(0).max(100, 'Slippage must be between 0 and 100'),
});

export const UniswapSwapBlockSchema = BaseBlockSchema.extend({
  type: z.literal('uniswap_swap'),
  params: UniswapSwapParamsSchema,
});

/**
 * Aave Supply Block Schema
 */
export const AaveSupplyParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  collateral: z.boolean(),
});

export const AaveSupplyBlockSchema = BaseBlockSchema.extend({
  type: z.literal('aave_supply'),
  params: AaveSupplyParamsSchema,
});

/**
 * Stop Loss Block Schema
 */
export const StopLossParamsSchema = z.object({
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
});

export const StopLossBlockSchema = BaseBlockSchema.extend({
  type: z.literal('stop_loss'),
  params: StopLossParamsSchema,
});

/**
 * Time Trigger Block Schema
 */
export const TimeTriggerParamsSchema = z.object({
  schedule: z.string().min(1, 'Schedule is required'),
  timezone: z.string().optional(),
});

export const TimeTriggerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('time_trigger'),
  params: TimeTriggerParamsSchema,
});

/**
 * Volume Trigger Block Schema
 */
export const VolumeTriggerParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  minVolume: z.number().positive('Minimum volume must be positive'),
  timeframe: z.enum(['1h', '4h', '24h', '7d']),
});

export const VolumeTriggerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('volume_trigger'),
  params: VolumeTriggerParamsSchema,
});

/**
 * Technical Indicator Trigger Block Schema
 */
export const TechnicalIndicatorTriggerParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  indicator: z.enum(['RSI', 'MACD', 'BB', 'MA']),
  condition: z.enum(['>=', '<=', '>', '<', '==']),
  value: z.number(),
  period: z.number().positive().optional(),
});

export const TechnicalIndicatorTriggerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('technical_indicator_trigger'),
  params: TechnicalIndicatorTriggerParamsSchema,
});

/**
 * Aave Borrow Block Schema
 */
export const AaveBorrowParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  interestRateMode: z.enum(['stable', 'variable']),
});

export const AaveBorrowBlockSchema = BaseBlockSchema.extend({
  type: z.literal('aave_borrow'),
  params: AaveBorrowParamsSchema,
});

/**
 * Aave Repay Block Schema
 */
export const AaveRepayParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  interestRateMode: z.enum(['stable', 'variable']),
});

export const AaveRepayBlockSchema = BaseBlockSchema.extend({
  type: z.literal('aave_repay'),
  params: AaveRepayParamsSchema,
});

/**
 * Aave Withdraw Block Schema
 */
export const AaveWithdrawParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
});

export const AaveWithdrawBlockSchema = BaseBlockSchema.extend({
  type: z.literal('aave_withdraw'),
  params: AaveWithdrawParamsSchema,
});

/**
 * Uniswap V3 Liquidity Block Schema
 */
export const UniswapV3LiquidityParamsSchema = z.object({
  token0: z.string().min(1, 'Token0 is required'),
  token1: z.string().min(1, 'Token1 is required'),
  amount0: z.number().positive('Amount0 must be positive'),
  amount1: z.number().positive('Amount1 must be positive'),
  feeTier: z.enum([500, 3000, 10000]),
  tickLower: z.number().optional(),
  tickUpper: z.number().optional(),
});

export const UniswapV3LiquidityBlockSchema = BaseBlockSchema.extend({
  type: z.literal('uniswap_v3_liquidity'),
  params: UniswapV3LiquidityParamsSchema,
});

/**
 * Compound Supply Block Schema
 */
export const CompoundSupplyParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
});

export const CompoundSupplyBlockSchema = BaseBlockSchema.extend({
  type: z.literal('compound_supply'),
  params: CompoundSupplyParamsSchema,
});

/**
 * Compound Borrow Block Schema
 */
export const CompoundBorrowParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
});

export const CompoundBorrowBlockSchema = BaseBlockSchema.extend({
  type: z.literal('compound_borrow'),
  params: CompoundBorrowParamsSchema,
});

/**
 * Curve Swap Block Schema
 */
export const CurveSwapParamsSchema = z.object({
  inputToken: z.string().min(1, 'Input token is required'),
  outputToken: z.string().min(1, 'Output token is required'),
  amount: z.number().positive('Amount must be positive'),
  slippage: z.number().min(0).max(100, 'Slippage must be between 0 and 100'),
  pool: z.string().optional(),
});

export const CurveSwapBlockSchema = BaseBlockSchema.extend({
  type: z.literal('curve_swap'),
  params: CurveSwapParamsSchema,
});

/**
 * Balancer Swap Block Schema
 */
export const BalancerSwapParamsSchema = z.object({
  inputToken: z.string().min(1, 'Input token is required'),
  outputToken: z.string().min(1, 'Output token is required'),
  amount: z.number().positive('Amount must be positive'),
  slippage: z.number().min(0).max(100, 'Slippage must be between 0 and 100'),
  pool: z.string().optional(),
});

export const BalancerSwapBlockSchema = BaseBlockSchema.extend({
  type: z.literal('balancer_swap'),
  params: BalancerSwapParamsSchema,
});

/**
 * 1inch Swap Block Schema
 */
export const OneInchSwapParamsSchema = z.object({
  inputToken: z.string().min(1, 'Input token is required'),
  outputToken: z.string().min(1, 'Output token is required'),
  amount: z.number().positive('Amount must be positive'),
  slippage: z.number().min(0).max(100, 'Slippage must be between 0 and 100'),
});

export const OneInchSwapBlockSchema = BaseBlockSchema.extend({
  type: z.literal('oneinch_swap'),
  params: OneInchSwapParamsSchema,
});

/**
 * Flash Loan Block Schema
 */
export const FlashLoanParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  protocol: z.enum(['aave']),
});

export const FlashLoanBlockSchema = BaseBlockSchema.extend({
  type: z.literal('flash_loan'),
  params: FlashLoanParamsSchema,
});

/**
 * Staking Block Schema
 */
export const StakingParamsSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  stakingType: z.enum(['eth2', 'token', 'liquidity']),
  pool: z.string().optional(),
});

export const StakingBlockSchema = BaseBlockSchema.extend({
  type: z.literal('staking'),
  params: StakingParamsSchema,
});

/**
 * Take Profit Block Schema
 */
export const TakeProfitParamsSchema = z.object({
  percentage: z.number().min(0).max(1000, 'Percentage must be between 0 and 1000'),
  asset: z.string().optional(),
});

export const TakeProfitBlockSchema = BaseBlockSchema.extend({
  type: z.literal('take_profit'),
  params: TakeProfitParamsSchema,
});

/**
 * Time Exit Block Schema
 */
export const TimeExitParamsSchema = z.object({
  duration: z.number().positive('Duration must be positive'),
  from: z.enum(['entry', 'position']),
});

export const TimeExitBlockSchema = BaseBlockSchema.extend({
  type: z.literal('time_exit'),
  params: TimeExitParamsSchema,
});

/**
 * Conditional Exit Block Schema
 */
export const ConditionalExitParamsSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  asset: z.string().optional(),
});

export const ConditionalExitBlockSchema = BaseBlockSchema.extend({
  type: z.literal('conditional_exit'),
  params: ConditionalExitParamsSchema,
});

/**
 * Position Sizing Block Schema
 */
export const PositionSizingParamsSchema = z.object({
  method: z.enum(['fixed', 'percentage', 'kelly', 'risk_based']),
  value: z.number().positive('Value must be positive'),
  maxPosition: z.number().positive().optional(),
});

export const PositionSizingBlockSchema = BaseBlockSchema.extend({
  type: z.literal('position_sizing'),
  params: PositionSizingParamsSchema,
});

/**
 * Risk Limits Block Schema
 */
export const RiskLimitsParamsSchema = z.object({
  maxDrawdown: z.number().min(0).max(100, 'Max drawdown must be between 0 and 100'),
  maxPositionSize: z.number().min(0).max(100, 'Max position size must be between 0 and 100'),
  maxLeverage: z.number().positive().optional(),
  maxDailyLoss: z.number().min(0).max(100, 'Max daily loss must be between 0 and 100').optional(),
});

export const RiskLimitsBlockSchema = BaseBlockSchema.extend({
  type: z.literal('risk_limits'),
  params: RiskLimitsParamsSchema,
});

/**
 * Rebalancing Block Schema
 */
export const RebalancingParamsSchema = z.object({
  targetAllocation: z.record(z.string(), z.number().min(0).max(100)),
  threshold: z.number().min(0).max(100, 'Threshold must be between 0 and 100'),
  method: z.enum(['proportional', 'equal']),
});

export const RebalancingBlockSchema = BaseBlockSchema.extend({
  type: z.literal('rebalancing'),
  params: RebalancingParamsSchema,
});

/**
 * Union schema for all block types
 */
export const TypedLegoBlockSchema = z.discriminatedUnion('type', [
  PriceTriggerBlockSchema,
  UniswapSwapBlockSchema,
  AaveSupplyBlockSchema,
  StopLossBlockSchema,
  TimeTriggerBlockSchema,
  VolumeTriggerBlockSchema,
  TechnicalIndicatorTriggerBlockSchema,
  AaveBorrowBlockSchema,
  AaveRepayBlockSchema,
  AaveWithdrawBlockSchema,
  UniswapV3LiquidityBlockSchema,
  CompoundSupplyBlockSchema,
  CompoundBorrowBlockSchema,
  CurveSwapBlockSchema,
  BalancerSwapBlockSchema,
  OneInchSwapBlockSchema,
  FlashLoanBlockSchema,
  StakingBlockSchema,
  TakeProfitBlockSchema,
  TimeExitBlockSchema,
  ConditionalExitBlockSchema,
  PositionSizingBlockSchema,
  RiskLimitsBlockSchema,
  RebalancingBlockSchema,
]);

/**
 * Array of blocks schema
 */
export const BlocksArraySchema = z.array(TypedLegoBlockSchema);

/**
 * Validate a block's parameters
 */
export function validateBlockParams(block: { type: string; params: unknown }): {
  valid: boolean;
  errors: string[];
  data?: unknown;
} {
  const errors: string[] = [];

  try {
    switch (block.type) {
      case 'price_trigger': {
        const result = PriceTriggerParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'uniswap_swap': {
        const result = UniswapSwapParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'aave_supply': {
        const result = AaveSupplyParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'stop_loss': {
        const result = StopLossParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'time_trigger': {
        const result = TimeTriggerParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'volume_trigger': {
        const result = VolumeTriggerParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'technical_indicator_trigger': {
        const result = TechnicalIndicatorTriggerParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'aave_borrow': {
        const result = AaveBorrowParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'aave_repay': {
        const result = AaveRepayParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'aave_withdraw': {
        const result = AaveWithdrawParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'uniswap_v3_liquidity': {
        const result = UniswapV3LiquidityParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'compound_supply': {
        const result = CompoundSupplyParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'compound_borrow': {
        const result = CompoundBorrowParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'curve_swap': {
        const result = CurveSwapParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'balancer_swap': {
        const result = BalancerSwapParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'oneinch_swap': {
        const result = OneInchSwapParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'flash_loan': {
        const result = FlashLoanParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'staking': {
        const result = StakingParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'take_profit': {
        const result = TakeProfitParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'time_exit': {
        const result = TimeExitParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'conditional_exit': {
        const result = ConditionalExitParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'position_sizing': {
        const result = PositionSizingParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'risk_limits': {
        const result = RiskLimitsParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'rebalancing': {
        const result = RebalancingParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map((e) => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      default:
        return { valid: false, errors: [`Unknown block type: ${block.type}`] };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed'],
    };
  }
}

/**
 * Parse and validate a block
 */
export function parseBlock(block: unknown): {
  success: boolean;
  data?: unknown;
  errors: string[];
} {
  try {
    const result = TypedLegoBlockSchema.safeParse(block);
    if (result.success) {
      return { success: true, data: result.data, errors: [] };
    }
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Parse failed'],
    };
  }
}

/**
 * Parse and validate an array of blocks
 */
export function parseBlocks(blocks: unknown): {
  success: boolean;
  data?: unknown[];
  errors: string[];
} {
  try {
    const result = BlocksArraySchema.safeParse(blocks);
    if (result.success) {
      return { success: true, data: result.data, errors: [] };
    }
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Parse failed'],
    };
  }
}
