/**
 * Sepolia Testnet Configuration
 * Comprehensive configuration for Sepolia testnet support
 */

import type { Address } from 'viem';
import { sepolia } from 'wagmi/chains';

export const SEPOLIA_CHAIN_ID = sepolia.id; // 11155111

/**
 * Sepolia RPC Endpoints (with fallbacks)
 */
export const SEPOLIA_RPC_ENDPOINTS = [
  'https://rpc.sepolia.org',
  'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc2.sepolia.org',
  'https://sepolia.gateway.tenderly.co',
] as const;

/**
 * Sepolia Block Explorer
 */
export const SEPOLIA_EXPLORER = {
  name: 'Etherscan Sepolia',
  url: 'https://sepolia.etherscan.io',
  apiUrl: 'https://api-sepolia.etherscan.io/api',
} as const;

/**
 * Sepolia Faucets
 */
export const SEPOLIA_FAUCETS = [
  {
    name: 'Alchemy Sepolia Faucet',
    url: 'https://sepoliafaucet.com',
    description: 'Free Sepolia ETH (requires Alchemy account)',
  },
  {
    name: 'Infura Sepolia Faucet',
    url: 'https://www.infura.io/faucet/sepolia',
    description: 'Free Sepolia ETH (requires Infura account)',
  },
  {
    name: 'QuickNode Sepolia Faucet',
    url: 'https://faucet.quicknode.com/ethereum/sepolia',
    description: 'Free Sepolia ETH (requires QuickNode account)',
  },
  {
    name: 'PoW Faucet',
    url: 'https://sepolia-faucet.pk910.de',
    description: 'Proof of Work faucet (no account required)',
  },
] as const;

/**
 * Sepolia DeFi Protocol Contract Addresses
 * These are the actual deployed contract addresses on Sepolia testnet
 */
export const SEPOLIA_CONTRACTS = {
  // Uniswap V2
  UNISWAP_V2_ROUTER: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008' as Address,
  UNISWAP_V2_FACTORY: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003' as Address,

  // Uniswap V3
  UNISWAP_V3_ROUTER: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as Address,
  UNISWAP_V3_FACTORY: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c' as Address,
  UNISWAP_V3_QUOTER: '0xEd1f6473345F45e35BCCd53d258d29dF0a3Ee0D2' as Address,
  UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER: '0x1238536071E1c677A632429e3655c799b22cDA52' as Address,

  // Aave V3
  AAVE_POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as Address,
  AAVE_POOL_ADDRESSES_PROVIDER: '0x0496275d34753A48320CA58103d5220e3945C8f1' as Address,
  AAVE_WETH_GATEWAY: '0x387d311e47e80b498169e6fb51d3193167d89F7D' as Address,

  // Compound V3
  COMPOUND_USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as Address,
  COMPOUND_COMET: '0x3EE77595A8459e93C2888b13aDB354017B198188' as Address,

  // WETH
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address,

  // Test Tokens (commonly used on Sepolia)
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address, // Sepolia USDC
  DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6' as Address, // Sepolia DAI
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as Address, // Sepolia USDT

  // Chainlink Price Feeds (Sepolia)
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as Address,
  CHAINLINK_BTC_USD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as Address,

  // 1inch (if available on Sepolia)
  ONE_INCH_ROUTER: '0x1111111254EEB25477B68fb85Ed929f73A960582' as Address, // May not be deployed

  // Curve (if available on Sepolia)
  CURVE_REGISTRY: '0x0000000000000000000000000000000000000000' as Address, // Not typically on testnets

  // Balancer (if available on Sepolia)
  BALANCER_VAULT: '0x0000000000000000000000000000000000000000' as Address, // Not typically on testnets
} as const;

/**
 * Sepolia Token Information
 */
export const SEPOLIA_TOKENS = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000' as Address,
    isNative: true,
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    address: SEPOLIA_CONTRACTS.WETH,
    isNative: false,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: SEPOLIA_CONTRACTS.USDC,
    isNative: false,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    address: SEPOLIA_CONTRACTS.DAI,
    isNative: false,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    address: SEPOLIA_CONTRACTS.USDT,
    isNative: false,
  },
} as const;

/**
 * Sepolia Gas Configuration
 */
export const SEPOLIA_GAS_CONFIG = {
  // Sepolia typically has lower gas prices than mainnet
  defaultGasPrice: 2000000000n, // 2 gwei
  maxGasPrice: 50000000000n, // 50 gwei
  minGasPrice: 1000000000n, // 1 gwei
  // EIP-1559 settings
  maxFeePerGas: 30000000000n, // 30 gwei
  maxPriorityFeePerGas: 2000000000n, // 2 gwei
  // Block time (seconds)
  blockTime: 12,
} as const;

/**
 * Sepolia Network Information
 */
export const SEPOLIA_NETWORK_INFO = {
  chainId: SEPOLIA_CHAIN_ID,
  name: 'Sepolia',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: SEPOLIA_RPC_ENDPOINTS,
  blockExplorers: [SEPOLIA_EXPLORER],
  testnet: true,
  faucets: SEPOLIA_FAUCETS,
} as const;

/**
 * Get Sepolia RPC URL (with fallback)
 */
export function getSepoliaRpcUrl(customUrl?: string): string {
  if (customUrl) return customUrl;
  return SEPOLIA_RPC_ENDPOINTS[0];
}

/**
 * Get contract address for a protocol on Sepolia
 */
export function getSepoliaContractAddress(protocol: keyof typeof SEPOLIA_CONTRACTS): Address {
  return SEPOLIA_CONTRACTS[protocol];
}

/**
 * Get token information for Sepolia
 */
export function getSepoliaToken(symbol: keyof typeof SEPOLIA_TOKENS) {
  return SEPOLIA_TOKENS[symbol];
}

/**
 * Get Sepolia explorer URL for an address or transaction
 */
export function getSepoliaExplorerUrl(type: 'address' | 'tx', hash: string): string {
  return `${SEPOLIA_EXPLORER.url}/${type}/${hash}`;
}

/**
 * Check if an address is a known Sepolia contract
 */
export function isSepoliaContract(address: Address): boolean {
  return Object.values(SEPOLIA_CONTRACTS).includes(address);
}

/**
 * Get Sepolia faucet URLs
 */
export function getSepoliaFaucets() {
  return SEPOLIA_FAUCETS;
}

/**
 * Sepolia-specific validation
 */
export function validateSepoliaAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format Sepolia transaction URL
 */
export function formatSepoliaTxUrl(txHash: string): string {
  return getSepoliaExplorerUrl('tx', txHash);
}

/**
 * Format Sepolia address URL
 */
export function formatSepoliaAddressUrl(address: Address): string {
  return getSepoliaExplorerUrl('address', address);
}
