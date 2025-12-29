import { LegoBlock, BlockCategory, Protocol } from './types';

export const AVAILABLE_BLOCKS: LegoBlock[] = [
  {
    id: 'template_uni_swap',
    type: 'uniswap_swap',
    label: 'UNISWAP SWAP',
    description: 'Swap tokens on Uniswap V3',
    category: BlockCategory.PROTOCOL,
    protocol: Protocol.UNISWAP,
    icon: 'swap',
    params: {
      inputToken: 'ETH',
      outputToken: 'USDC',
      amount: 1.0,
      slippage: 0.5,
    },
  },
  {
    id: 'template_aave_supply',
    type: 'aave_supply',
    label: 'AAVE SUPPLY',
    description: 'Supply assets to Aave lending pool',
    category: BlockCategory.PROTOCOL,
    protocol: Protocol.AAVE,
    icon: 'supply',
    params: {
      asset: 'USDC',
      amount: 1000,
      collateral: true,
    },
  },
  {
    id: 'template_price_trigger',
    type: 'price_trigger',
    label: 'PRICE TRIGGER',
    description: 'Execute when price hits target',
    category: BlockCategory.ENTRY,
    protocol: Protocol.GENERIC,
    icon: 'trigger',
    params: {
      asset: 'ETH',
      targetPrice: 3000,
      condition: '>=',
    },
  },
  {
    id: 'template_stop_loss',
    type: 'stop_loss',
    label: 'STOP LOSS',
    description: 'Exit position if drawdown exceeds limit',
    category: BlockCategory.EXIT,
    protocol: Protocol.GENERIC,
    icon: 'shield',
    params: {
      percentage: 10,
    },
  },
];

export const PROTOCOL_COLORS = {
  [Protocol.UNISWAP]: '#FF007A',
  [Protocol.AAVE]: '#B6509E',
  [Protocol.COMPOUND]: '#00D395',
  [Protocol.GENERIC]: '#FF5500',
};
