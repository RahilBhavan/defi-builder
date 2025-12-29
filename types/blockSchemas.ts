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
 * Union schema for all block types
 */
export const TypedLegoBlockSchema = z.discriminatedUnion('type', [
  PriceTriggerBlockSchema,
  UniswapSwapBlockSchema,
  AaveSupplyBlockSchema,
  StopLossBlockSchema,
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
          errors.push(...result.error.errors.map(e => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'uniswap_swap': {
        const result = UniswapSwapParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map(e => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'aave_supply': {
        const result = AaveSupplyParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map(e => e.message));
          return { valid: false, errors };
        }
        return { valid: true, errors: [], data: result.data };
      }

      case 'stop_loss': {
        const result = StopLossParamsSchema.safeParse(block.params);
        if (!result.success) {
          errors.push(...result.error.errors.map(e => e.message));
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
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
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
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Parse failed'],
    };
  }
}

