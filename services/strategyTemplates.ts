/**
 * Pre-built strategy templates
 * Provides ready-to-use strategies for common DeFi use cases
 */

import { BlockCategory, type LegoBlock, Protocol } from '../types';

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'DCA' | 'Yield Farming' | 'Arbitrage' | 'Lending' | 'Trading' | 'Risk Management';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  blocks: LegoBlock[];
  estimatedAPY?: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

/**
 * Dollar Cost Averaging (DCA) Strategy
 * Regularly buys a fixed amount of tokens
 */
const dcaStrategy: StrategyTemplate = {
  id: 'template_dca',
  name: 'Dollar Cost Averaging (DCA)',
  description: 'Automatically purchase tokens at regular intervals to average out price volatility',
  category: 'DCA',
  difficulty: 'Beginner',
  tags: ['DCA', 'Automated', 'Buying'],
  riskLevel: 'Low',
  estimatedAPY: 0,
  blocks: [
    {
      id: 'dca_time_trigger',
      type: 'time_trigger',
      label: 'TIME TRIGGER',
      description: 'Execute daily at 9 AM UTC',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'clock',
      params: {
        schedule: '0 9 * * *',
        timezone: 'UTC',
      },
    },
    {
      id: 'dca_swap',
      type: 'uniswap_swap',
      label: 'UNISWAP SWAP',
      description: 'Buy ETH with USDC',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.UNISWAP,
      icon: 'swap',
      params: {
        inputToken: 'USDC',
        outputToken: 'ETH',
        amount: 100,
        slippage: 0.5,
      },
    },
    {
      id: 'dca_stop_loss',
      type: 'stop_loss',
      label: 'STOP LOSS',
      description: 'Exit if drawdown exceeds 20%',
      category: BlockCategory.EXIT,
      protocol: Protocol.GENERIC,
      icon: 'shield',
      params: {
        percentage: 20,
      },
    },
  ],
};

/**
 * Yield Farming Strategy
 * Supply assets to Aave and earn interest
 */
const yieldFarmingStrategy: StrategyTemplate = {
  id: 'template_yield_farming',
  name: 'Yield Farming',
  description: 'Supply assets to Aave lending pool to earn interest while maintaining liquidity',
  category: 'Yield Farming',
  difficulty: 'Beginner',
  tags: ['Yield', 'Lending', 'Aave'],
  riskLevel: 'Low',
  estimatedAPY: 5,
  blocks: [
    {
      id: 'yf_price_trigger',
      type: 'price_trigger',
      label: 'PRICE TRIGGER',
      description: 'Enter when ETH price is favorable',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'trigger',
      params: {
        asset: 'ETH',
        targetPrice: 3000,
        condition: '<=',
      },
    },
    {
      id: 'yf_swap',
      type: 'uniswap_swap',
      label: 'UNISWAP SWAP',
      description: 'Swap USDC for ETH',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.UNISWAP,
      icon: 'swap',
      params: {
        inputToken: 'USDC',
        outputToken: 'ETH',
        amount: 1000,
        slippage: 0.5,
      },
    },
    {
      id: 'yf_supply',
      type: 'aave_supply',
      label: 'AAVE SUPPLY',
      description: 'Supply ETH to Aave to earn interest',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.AAVE,
      icon: 'supply',
      params: {
        asset: 'ETH',
        amount: 1.0,
        collateral: true,
      },
    },
    {
      id: 'yf_take_profit',
      type: 'take_profit',
      label: 'TAKE PROFIT',
      description: 'Exit when profit reaches 15%',
      category: BlockCategory.EXIT,
      protocol: Protocol.GENERIC,
      icon: 'trending-up',
      params: {
        percentage: 15,
      },
    },
  ],
};

/**
 * Simple Arbitrage Strategy
 * Attempts to profit from price differences across DEXs
 */
const arbitrageStrategy: StrategyTemplate = {
  id: 'template_arbitrage',
  name: 'Simple Arbitrage',
  description: 'Detect and execute arbitrage opportunities between Uniswap and Curve',
  category: 'Arbitrage',
  difficulty: 'Advanced',
  tags: ['Arbitrage', 'DEX', 'Flash Loan'],
  riskLevel: 'High',
  estimatedAPY: 20,
  blocks: [
    {
      id: 'arb_price_trigger',
      type: 'price_trigger',
      label: 'PRICE TRIGGER',
      description: 'Monitor for price differences',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'trigger',
      params: {
        asset: 'USDC',
        targetPrice: 1.01,
        condition: '>=',
      },
    },
    {
      id: 'arb_flash_loan',
      type: 'flash_loan',
      label: 'FLASH LOAN',
      description: 'Borrow capital for arbitrage',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.AAVE,
      icon: 'zap',
      params: {
        asset: 'USDC',
        amount: 10000,
        protocol: 'aave',
      },
    },
    {
      id: 'arb_swap_1',
      type: 'uniswap_swap',
      label: 'UNISWAP SWAP',
      description: 'Buy on Uniswap',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.UNISWAP,
      icon: 'swap',
      params: {
        inputToken: 'USDC',
        outputToken: 'DAI',
        amount: 10000,
        slippage: 0.1,
      },
    },
    {
      id: 'arb_swap_2',
      type: 'curve_swap',
      label: 'CURVE SWAP',
      description: 'Sell on Curve',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.CURVE,
      icon: 'swap',
      params: {
        inputToken: 'DAI',
        outputToken: 'USDC',
        amount: 10000,
        slippage: 0.1,
      },
    },
    {
      id: 'arb_stop_loss',
      type: 'stop_loss',
      label: 'STOP LOSS',
      description: 'Exit if loss exceeds 2%',
      category: BlockCategory.EXIT,
      protocol: Protocol.GENERIC,
      icon: 'shield',
      params: {
        percentage: 2,
      },
    },
  ],
};

/**
 * Lending Strategy
 * Supply and borrow to maximize yield
 */
const lendingStrategy: StrategyTemplate = {
  id: 'template_lending',
  name: 'Leveraged Lending',
  description: 'Supply collateral to Aave, borrow against it, and reinvest for higher yield',
  category: 'Lending',
  difficulty: 'Intermediate',
  tags: ['Lending', 'Leverage', 'Aave'],
  riskLevel: 'High',
  estimatedAPY: 12,
  blocks: [
    {
      id: 'lend_supply',
      type: 'aave_supply',
      label: 'AAVE SUPPLY',
      description: 'Supply ETH as collateral',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.AAVE,
      icon: 'supply',
      params: {
        asset: 'ETH',
        amount: 10,
        collateral: true,
      },
    },
    {
      id: 'lend_borrow',
      type: 'aave_borrow',
      label: 'AAVE BORROW',
      description: 'Borrow USDC against collateral',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.AAVE,
      icon: 'arrow-down',
      params: {
        asset: 'USDC',
        amount: 15000,
        interestRateMode: 'variable',
      },
    },
    {
      id: 'lend_reinvest',
      type: 'compound_supply',
      label: 'COMPOUND SUPPLY',
      description: 'Supply borrowed USDC to Compound',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.COMPOUND,
      icon: 'supply',
      params: {
        asset: 'USDC',
        amount: 15000,
      },
    },
    {
      id: 'lend_risk_limits',
      type: 'risk_limits',
      label: 'RISK LIMITS',
      description: 'Set maximum drawdown protection',
      category: BlockCategory.RISK,
      protocol: Protocol.GENERIC,
      icon: 'alert-triangle',
      params: {
        maxDrawdown: 15,
        maxPositionSize: 30,
        maxLeverage: 2,
      },
    },
  ],
};

/**
 * Rebalancing Strategy
 * Maintain target asset allocation
 */
const rebalancingStrategy: StrategyTemplate = {
  id: 'template_rebalancing',
  name: 'Portfolio Rebalancing',
  description:
    'Automatically rebalance portfolio to maintain target allocation across multiple assets',
  category: 'Risk Management',
  difficulty: 'Intermediate',
  tags: ['Rebalancing', 'Portfolio', 'Risk'],
  riskLevel: 'Medium',
  estimatedAPY: 8,
  blocks: [
    {
      id: 'rebal_time_trigger',
      type: 'time_trigger',
      label: 'TIME TRIGGER',
      description: 'Rebalance weekly',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'clock',
      params: {
        schedule: '0 9 * * 1',
        timezone: 'UTC',
      },
    },
    {
      id: 'rebal_rebalancing',
      type: 'rebalancing',
      label: 'REBALANCING',
      description: 'Maintain 40% ETH, 30% USDC, 30% WBTC',
      category: BlockCategory.RISK,
      protocol: Protocol.GENERIC,
      icon: 'refresh-cw',
      params: {
        targetAllocation: {
          ETH: 40,
          USDC: 30,
          WBTC: 30,
        },
        threshold: 5,
        method: 'proportional',
      },
    },
    {
      id: 'rebal_position_sizing',
      type: 'position_sizing',
      label: 'POSITION SIZING',
      description: 'Use percentage-based sizing',
      category: BlockCategory.RISK,
      protocol: Protocol.GENERIC,
      icon: 'sliders',
      params: {
        method: 'percentage',
        value: 10,
        maxPosition: 20,
      },
    },
  ],
};

/**
 * Trading Bot Strategy
 * Technical indicator-based trading
 */
const tradingBotStrategy: StrategyTemplate = {
  id: 'template_trading_bot',
  name: 'Technical Trading Bot',
  description: 'Use technical indicators (RSI, MACD) to make trading decisions',
  category: 'Trading',
  difficulty: 'Advanced',
  tags: ['Trading', 'Technical Analysis', 'Indicators'],
  riskLevel: 'High',
  estimatedAPY: 15,
  blocks: [
    {
      id: 'trading_rsi_trigger',
      type: 'technical_indicator_trigger',
      label: 'RSI TRIGGER',
      description: 'Buy when RSI < 30 (oversold)',
      category: BlockCategory.ENTRY,
      protocol: Protocol.GENERIC,
      icon: 'trending-up',
      params: {
        asset: 'ETH',
        indicator: 'RSI',
        condition: '<=',
        value: 30,
        period: 14,
      },
    },
    {
      id: 'trading_buy',
      type: 'uniswap_swap',
      label: 'UNISWAP SWAP',
      description: 'Buy ETH',
      category: BlockCategory.PROTOCOL,
      protocol: Protocol.UNISWAP,
      icon: 'swap',
      params: {
        inputToken: 'USDC',
        outputToken: 'ETH',
        amount: 1000,
        slippage: 0.5,
      },
    },
    {
      id: 'trading_take_profit',
      type: 'take_profit',
      label: 'TAKE PROFIT',
      description: 'Sell when profit reaches 10%',
      category: BlockCategory.EXIT,
      protocol: Protocol.GENERIC,
      icon: 'trending-up',
      params: {
        percentage: 10,
      },
    },
    {
      id: 'trading_stop_loss',
      type: 'stop_loss',
      label: 'STOP LOSS',
      description: 'Exit if loss exceeds 5%',
      category: BlockCategory.EXIT,
      protocol: Protocol.GENERIC,
      icon: 'shield',
      params: {
        percentage: 5,
      },
    },
  ],
};

/**
 * All available strategy templates
 */
export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  dcaStrategy,
  yieldFarmingStrategy,
  arbitrageStrategy,
  lendingStrategy,
  rebalancingStrategy,
  tradingBotStrategy,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: StrategyTemplate['category']): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: StrategyTemplate['difficulty']
): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Search templates by tags or name
 */
export function searchTemplates(query: string): StrategyTemplate[] {
  const lowerQuery = query.toLowerCase();
  return STRATEGY_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
