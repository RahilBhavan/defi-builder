/**
 * Web3 configuration for wallet connections
 * Uses wagmi and viem for Ethereum interactions
 * Sepolia is the default testnet for development
 */

import { http, createConfig, fallback } from 'wagmi';
import { arbitrum, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Sepolia RPC endpoints with fallbacks for reliability
const SEPOLIA_RPC_ENDPOINTS = [
  'https://rpc.sepolia.org',
  'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc2.sepolia.org',
] as const;

// Get RPC URLs from settings or use defaults
function getRpcUrl(chainId: number): string {
  // In production, these would come from settings
  const rpcUrls: Record<number, string> = {
    [mainnet.id]: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    [sepolia.id]: SEPOLIA_RPC_ENDPOINTS[0],
    [polygon.id]: 'https://polygon-rpc.com',
    [arbitrum.id]: 'https://arb1.arbitrum.io/rpc',
    [optimism.id]: 'https://mainnet.optimism.io',
  };

  return rpcUrls[chainId] || rpcUrls[sepolia.id] || SEPOLIA_RPC_ENDPOINTS[0];
}

/**
 * Get RPC transports with fallback for Sepolia
 * Uses multiple RPC endpoints for reliability
 */
function getRpcTransports() {
  return {
    [sepolia.id]: fallback(
      SEPOLIA_RPC_ENDPOINTS.map((url) => http(url)),
      { rank: false }
    ),
    [mainnet.id]: http(getRpcUrl(mainnet.id)),
    [polygon.id]: http(getRpcUrl(polygon.id)),
    [arbitrum.id]: http(getRpcUrl(arbitrum.id)),
    [optimism.id]: http(getRpcUrl(optimism.id)),
  };
}

/**
 * Wagmi configuration
 * Supports multiple chains with custom RPC providers
 * Sepolia is listed first as the default testnet
 */
export const wagmiConfig = createConfig({
  chains: [sepolia, mainnet, polygon, arbitrum, optimism],
  connectors: [injected(), metaMask()],
  transports: getRpcTransports(),
  // Set Sepolia as the default chain for development
  ssr: false,
});

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAINS = {
  SEPOLIA: sepolia.id,
  MAINNET: mainnet.id,
  POLYGON: polygon.id,
  ARBITRUM: arbitrum.id,
  OPTIMISM: optimism.id,
} as const;

/**
 * Get chain name from ID
 */
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    [sepolia.id]: 'Sepolia',
    [mainnet.id]: 'Ethereum',
    [polygon.id]: 'Polygon',
    [arbitrum.id]: 'Arbitrum',
    [optimism.id]: 'Optimism',
  };

  return chainNames[chainId] || 'Unknown';
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).includes(
    chainId as (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS]
  );
}

/**
 * Default chain ID (Sepolia for development)
 */
export const DEFAULT_CHAIN_ID = sepolia.id;

/**
 * Check if chain is Sepolia
 */
export function isSepolia(chainId: number): boolean {
  return chainId === sepolia.id;
}
