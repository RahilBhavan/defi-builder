/**
 * Type-safe parameter interfaces for each block type
 * Replaces the loose BlockParams type with specific, validated interfaces
 */

import { BlockCategory, type Protocol } from '../types';

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
 * Time Trigger Block Parameters
 */
export interface TimeTriggerParams {
  schedule: string; // Cron expression or time string
  timezone?: string;
}

export interface TimeTriggerBlock extends BaseBlock {
  type: 'time_trigger';
  params: TimeTriggerParams;
}

/**
 * Volume Trigger Block Parameters
 */
export interface VolumeTriggerParams {
  asset: string;
  minVolume: number;
  timeframe: '1h' | '4h' | '24h' | '7d';
}

export interface VolumeTriggerBlock extends BaseBlock {
  type: 'volume_trigger';
  params: VolumeTriggerParams;
}

/**
 * Technical Indicator Trigger Block Parameters
 */
export interface TechnicalIndicatorTriggerParams {
  asset: string;
  indicator: 'RSI' | 'MACD' | 'BB' | 'MA';
  condition: '>=' | '<=' | '>' | '<' | '==';
  value: number;
  period?: number;
}

export interface TechnicalIndicatorTriggerBlock extends BaseBlock {
  type: 'technical_indicator_trigger';
  params: TechnicalIndicatorTriggerParams;
}

/**
 * Aave Borrow Block Parameters
 */
export interface AaveBorrowParams {
  asset: string;
  amount: number;
  interestRateMode: 'stable' | 'variable';
}

export interface AaveBorrowBlock extends BaseBlock {
  type: 'aave_borrow';
  params: AaveBorrowParams;
}

/**
 * Aave Repay Block Parameters
 */
export interface AaveRepayParams {
  asset: string;
  amount: number;
  interestRateMode: 'stable' | 'variable';
}

export interface AaveRepayBlock extends BaseBlock {
  type: 'aave_repay';
  params: AaveRepayParams;
}

/**
 * Aave Withdraw Block Parameters
 */
export interface AaveWithdrawParams {
  asset: string;
  amount: number;
}

export interface AaveWithdrawBlock extends BaseBlock {
  type: 'aave_withdraw';
  params: AaveWithdrawParams;
}

/**
 * Uniswap V3 Liquidity Block Parameters
 */
export interface UniswapV3LiquidityParams {
  token0: string;
  token1: string;
  amount0: number;
  amount1: number;
  feeTier: 500 | 3000 | 10000; // 0.05%, 0.3%, 1%
  tickLower?: number;
  tickUpper?: number;
}

export interface UniswapV3LiquidityBlock extends BaseBlock {
  type: 'uniswap_v3_liquidity';
  params: UniswapV3LiquidityParams;
}

/**
 * Compound Supply Block Parameters
 */
export interface CompoundSupplyParams {
  asset: string;
  amount: number;
}

export interface CompoundSupplyBlock extends BaseBlock {
  type: 'compound_supply';
  params: CompoundSupplyParams;
}

/**
 * Compound Borrow Block Parameters
 */
export interface CompoundBorrowParams {
  asset: string;
  amount: number;
}

export interface CompoundBorrowBlock extends BaseBlock {
  type: 'compound_borrow';
  params: CompoundBorrowParams;
}

/**
 * Curve Swap Block Parameters
 */
export interface CurveSwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number;
  pool?: string;
}

export interface CurveSwapBlock extends BaseBlock {
  type: 'curve_swap';
  params: CurveSwapParams;
}

/**
 * Balancer Swap Block Parameters
 */
export interface BalancerSwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number;
  pool?: string;
}

export interface BalancerSwapBlock extends BaseBlock {
  type: 'balancer_swap';
  params: BalancerSwapParams;
}

/**
 * 1inch Swap Block Parameters
 */
export interface OneInchSwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number;
}

export interface OneInchSwapBlock extends BaseBlock {
  type: 'oneinch_swap';
  params: OneInchSwapParams;
}

/**
 * Flash Loan Block Parameters
 */
export interface FlashLoanParams {
  asset: string;
  amount: number;
  protocol: 'aave';
}

export interface FlashLoanBlock extends BaseBlock {
  type: 'flash_loan';
  params: FlashLoanParams;
}

/**
 * Staking Block Parameters
 */
export interface StakingParams {
  asset: string;
  amount: number;
  stakingType: 'eth2' | 'token' | 'liquidity';
  pool?: string;
}

export interface StakingBlock extends BaseBlock {
  type: 'staking';
  params: StakingParams;
}

/**
 * Take Profit Block Parameters
 */
export interface TakeProfitParams {
  percentage: number; // Profit percentage to exit at
  asset?: string; // Optional: specific asset to exit
}

export interface TakeProfitBlock extends BaseBlock {
  type: 'take_profit';
  params: TakeProfitParams;
}

/**
 * Time Exit Block Parameters
 */
export interface TimeExitParams {
  duration: number; // Duration in milliseconds
  from: 'entry' | 'position'; // Start counting from entry or position open
}

export interface TimeExitBlock extends BaseBlock {
  type: 'time_exit';
  params: TimeExitParams;
}

/**
 * Conditional Exit Block Parameters
 */
export interface ConditionalExitParams {
  condition: string; // Expression to evaluate
  asset?: string;
}

export interface ConditionalExitBlock extends BaseBlock {
  type: 'conditional_exit';
  params: ConditionalExitParams;
}

/**
 * Position Sizing Block Parameters
 */
export interface PositionSizingParams {
  method: 'fixed' | 'percentage' | 'kelly' | 'risk_based';
  value: number; // Amount or percentage
  maxPosition?: number;
}

export interface PositionSizingBlock extends BaseBlock {
  type: 'position_sizing';
  params: PositionSizingParams;
}

/**
 * Risk Limits Block Parameters
 */
export interface RiskLimitsParams {
  maxDrawdown: number; // Percentage
  maxPositionSize: number; // Percentage of portfolio
  maxLeverage?: number;
  maxDailyLoss?: number; // Percentage
}

export interface RiskLimitsBlock extends BaseBlock {
  type: 'risk_limits';
  params: RiskLimitsParams;
}

/**
 * Rebalancing Block Parameters
 */
export interface RebalancingParams {
  targetAllocation: Record<string, number>; // token -> percentage
  threshold: number; // Rebalance when deviation exceeds this percentage
  method: 'proportional' | 'equal';
}

export interface RebalancingBlock extends BaseBlock {
  type: 'rebalancing';
  params: RebalancingParams;
}

/**
 * Union type for all typed blocks
 */
export type TypedLegoBlock =
  | PriceTriggerBlock
  | UniswapSwapBlock
  | AaveSupplyBlock
  | StopLossBlock
  | TimeTriggerBlock
  | VolumeTriggerBlock
  | TechnicalIndicatorTriggerBlock
  | AaveBorrowBlock
  | AaveRepayBlock
  | AaveWithdrawBlock
  | UniswapV3LiquidityBlock
  | CompoundSupplyBlock
  | CompoundBorrowBlock
  | CurveSwapBlock
  | BalancerSwapBlock
  | OneInchSwapBlock
  | FlashLoanBlock
  | StakingBlock
  | TakeProfitBlock
  | TimeExitBlock
  | ConditionalExitBlock
  | PositionSizingBlock
  | RiskLimitsBlock
  | RebalancingBlock;

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

export function isTimeTriggerBlock(block: { type: string }): block is TimeTriggerBlock {
  return block.type === 'time_trigger';
}

export function isVolumeTriggerBlock(block: { type: string }): block is VolumeTriggerBlock {
  return block.type === 'volume_trigger';
}

export function isTechnicalIndicatorTriggerBlock(block: {
  type: string;
}): block is TechnicalIndicatorTriggerBlock {
  return block.type === 'technical_indicator_trigger';
}

export function isAaveBorrowBlock(block: { type: string }): block is AaveBorrowBlock {
  return block.type === 'aave_borrow';
}

export function isAaveRepayBlock(block: { type: string }): block is AaveRepayBlock {
  return block.type === 'aave_repay';
}

export function isAaveWithdrawBlock(block: { type: string }): block is AaveWithdrawBlock {
  return block.type === 'aave_withdraw';
}

export function isUniswapV3LiquidityBlock(block: {
  type: string;
}): block is UniswapV3LiquidityBlock {
  return block.type === 'uniswap_v3_liquidity';
}

export function isCompoundSupplyBlock(block: { type: string }): block is CompoundSupplyBlock {
  return block.type === 'compound_supply';
}

export function isCompoundBorrowBlock(block: { type: string }): block is CompoundBorrowBlock {
  return block.type === 'compound_borrow';
}

export function isCurveSwapBlock(block: { type: string }): block is CurveSwapBlock {
  return block.type === 'curve_swap';
}

export function isBalancerSwapBlock(block: { type: string }): block is BalancerSwapBlock {
  return block.type === 'balancer_swap';
}

export function isOneInchSwapBlock(block: { type: string }): block is OneInchSwapBlock {
  return block.type === 'oneinch_swap';
}

export function isFlashLoanBlock(block: { type: string }): block is FlashLoanBlock {
  return block.type === 'flash_loan';
}

export function isStakingBlock(block: { type: string }): block is StakingBlock {
  return block.type === 'staking';
}

export function isTakeProfitBlock(block: { type: string }): block is TakeProfitBlock {
  return block.type === 'take_profit';
}

export function isTimeExitBlock(block: { type: string }): block is TimeExitBlock {
  return block.type === 'time_exit';
}

export function isConditionalExitBlock(block: { type: string }): block is ConditionalExitBlock {
  return block.type === 'conditional_exit';
}

export function isPositionSizingBlock(block: { type: string }): block is PositionSizingBlock {
  return block.type === 'position_sizing';
}

export function isRiskLimitsBlock(block: { type: string }): block is RiskLimitsBlock {
  return block.type === 'risk_limits';
}

export function isRebalancingBlock(block: { type: string }): block is RebalancingBlock {
  return block.type === 'rebalancing';
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
