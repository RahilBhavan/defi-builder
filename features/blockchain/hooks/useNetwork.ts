/**
 * Custom hook for network management
 * Provides network information and validation
 */

import { useMemo } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { SUPPORTED_CHAINS, getChainName, isChainSupported } from '../services/web3/config';
import { Protocol } from '../types';

/**
 * Network capabilities for different protocols
 */
const PROTOCOL_NETWORK_SUPPORT: Record<Protocol, number[]> = {
  [Protocol.UNISWAP]: [
    SUPPORTED_CHAINS.MAINNET,
    SUPPORTED_CHAINS.POLYGON,
    SUPPORTED_CHAINS.ARBITRUM,
    SUPPORTED_CHAINS.OPTIMISM,
    SUPPORTED_CHAINS.SEPOLIA,
  ],
  [Protocol.AAVE]: [
    SUPPORTED_CHAINS.MAINNET,
    SUPPORTED_CHAINS.POLYGON,
    SUPPORTED_CHAINS.ARBITRUM,
    SUPPORTED_CHAINS.OPTIMISM,
    SUPPORTED_CHAINS.SEPOLIA,
  ],
  [Protocol.COMPOUND]: [SUPPORTED_CHAINS.MAINNET, SUPPORTED_CHAINS.SEPOLIA],
  [Protocol.CURVE]: [SUPPORTED_CHAINS.MAINNET, SUPPORTED_CHAINS.POLYGON],
  [Protocol.BALANCER]: [SUPPORTED_CHAINS.MAINNET, SUPPORTED_CHAINS.POLYGON],
  [Protocol.ONEINCH]: [
    SUPPORTED_CHAINS.MAINNET,
    SUPPORTED_CHAINS.POLYGON,
    SUPPORTED_CHAINS.ARBITRUM,
    SUPPORTED_CHAINS.OPTIMISM,
  ],
  [Protocol.GENERIC]: Object.values(SUPPORTED_CHAINS),
};

export interface NetworkState {
  chainId: number | undefined;
  chainName: string | undefined;
  isSupported: boolean;
  switchNetwork: (chainId: number) => void;
  isProtocolSupported: (protocol: Protocol) => boolean;
  getSupportedChains: () => Array<{ id: number; name: string }>;
}

/**
 * Hook for network management
 */
export function useNetwork(): NetworkState {
  const chainId = useChainId();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  const chainName = chainId ? getChainName(chainId) : undefined;
  const isSupported = useMemo(() => {
    return chainId ? isChainSupported(chainId) : false;
  }, [chainId]);

  const isProtocolSupported = useMemo(() => {
    return (protocol: Protocol): boolean => {
      if (!chainId) return false;
      const supportedChains = PROTOCOL_NETWORK_SUPPORT[protocol] || [];
      return supportedChains.includes(chainId);
    };
  }, [chainId]);

  const switchNetwork = (targetChainId: number) => {
    if (wagmiSwitchChain) {
      wagmiSwitchChain({ chainId: targetChainId });
    }
  };

  const getSupportedChains = () => {
    return Object.entries(SUPPORTED_CHAINS).map(([name, id]) => ({
      id,
      name: getChainName(id),
    }));
  };

  return {
    chainId,
    chainName,
    isSupported,
    switchNetwork,
    isProtocolSupported,
    getSupportedChains,
  };
}
