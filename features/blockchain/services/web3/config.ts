/**
 * Web3 configuration for wallet connections
 * Uses wagmi and viem for Ethereum interactions
 */

import { http, createConfig } from 'wagmi';
import { arbitrum, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Get RPC URLs from settings or use defaults
function getRpcUrl(chainId: number): string {
  // In production, these would come from settings
  const rpcUrls: Record<number, string> = {
    [mainnet.id]: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    [sepolia.id]: 'https://rpc.sepolia.org',
    [polygon.id]: 'https://polygon-rpc.com',
    [arbitrum.id]: 'https://arb1.arbitrum.io/rpc',
    [optimism.id]: 'https://mainnet.optimism.io',
  };

  return rpcUrls[chainId] || rpcUrls[sepolia.id] || 'https://rpc.sepolia.org';
}

/**
 * Wagmi configuration
 * Supports multiple chains with custom RPC providers
 */
export const wagmiConfig = createConfig({
  chains: [sepolia, mainnet, polygon, arbitrum, optimism],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(getRpcUrl(sepolia.id)),
    [mainnet.id]: http(getRpcUrl(mainnet.id)),
    [polygon.id]: http(getRpcUrl(polygon.id)),
    [arbitrum.id]: http(getRpcUrl(arbitrum.id)),
    [optimism.id]: http(getRpcUrl(optimism.id)),
  },
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
