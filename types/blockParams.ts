/**
 * Type-safe parameter interfaces for each block type
 * Replaces the loose BlockParams type with specific, validated interfaces
 */

import { BlockCategory, Protocol } from '../types';

/**
 * Base block interface with common properties
 */
export interface BaseBlock {
  id: string;
  type: string;
  label: string;
  description: string;
  category: BlockCategory;
  protocol: Protocol;
  icon: string;
}

/**
 * Price Trigger Block Parameters
 */
export interface PriceTriggerParams {
  asset: string;
  targetPrice: number;
  condition: '>=' | '<=' | '>' | '<' | '==';
}

export interface PriceTriggerBlock extends BaseBlock {
  type: 'price_trigger';
  params: PriceTriggerParams;
}

/**
 * Uniswap Swap Block Parameters
 */
export interface UniswapSwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number; // Percentage (e.g., 0.5 for 0.5%)
}

export interface UniswapSwapBlock extends BaseBlock {
  type: 'uniswap_swap';
  params: UniswapSwapParams;
}

/**
 * Aave Supply Block Parameters
 */
export interface AaveSupplyParams {
  asset: string;
  amount: number;
  collateral: boolean;
}

export interface AaveSupplyBlock extends BaseBlock {
  type: 'aave_supply';
  params: AaveSupplyParams;
}

/**
 * Stop Loss Block Parameters
 */
export interface StopLossParams {
  percentage: number; // Percentage (e.g., 10 for 10%)
}

export interface StopLossBlock extends BaseBlock {
  type: 'stop_loss';
  params: StopLossParams;
}

/**
 * Union type for all typed blocks
 */
export type TypedLegoBlock =
  | PriceTriggerBlock
  | UniswapSwapBlock
  | AaveSupplyBlock
  | StopLossBlock;

/**
 * Type guard functions
 */
export function isPriceTriggerBlock(block: { type: string }): block is PriceTriggerBlock {
  return block.type === 'price_trigger';
}

export function isUniswapSwapBlock(block: { type: string }): block is UniswapSwapBlock {
  return block.type === 'uniswap_swap';
}

export function isAaveSupplyBlock(block: { type: string }): block is AaveSupplyBlock {
  return block.type === 'aave_supply';
}

export function isStopLossBlock(block: { type: string }): block is StopLossBlock {
  return block.type === 'stop_loss';
}

/**
 * Get block category type guard
 */
export function isEntryBlock(block: { category: BlockCategory }): boolean {
  return block.category === BlockCategory.ENTRY;
}

export function isProtocolBlock(block: { category: BlockCategory }): boolean {
  return block.category === BlockCategory.PROTOCOL;
}

export function isExitBlock(block: { category: BlockCategory }): boolean {
  return block.category === BlockCategory.EXIT;
}

export function isRiskBlock(block: { category: BlockCategory }): boolean {
  return block.category === BlockCategory.RISK;
}

