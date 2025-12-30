/**
 * Custom hook for wallet connection using wagmi
 * Provides simplified interface for wallet operations
 */

import { useCallback } from 'react';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { logger } from '../utils/logger';
import { getChainName } from '../services/web3/config';
import { useToast } from './useToast';

export interface WalletState {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  chainName: string | undefined;
  connect: (connector?: 'injected' | 'walletConnect') => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  error: Error | null;
}

/**
 * Hook for wallet connection and management
 */
export function useWallet(): WalletState {
  const { address, isConnected } = useAccount();
  const {
    connect: wagmiConnect,
    connectors,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain: wagmiSwitchChain, isPending: isSwitching } = useSwitchChain();
  const { error: showError, success: showSuccess } = useToast();

  const connect = useCallback(
    async (connectorType: 'injected' | 'walletConnect' = 'injected') => {
      try {
        let targetConnector;

        if (connectorType === 'injected') {
          targetConnector = connectors.find((c) => c.id === 'injected' || c.name === 'MetaMask');
        } else {
          targetConnector = connectors.find((c) => c.id === 'walletConnect');
        }

        if (!targetConnector) {
          showError('Wallet connector not found. Please install MetaMask or use WalletConnect.');
          return;
        }

        await wagmiConnect({ connector: targetConnector });
        showSuccess('Wallet connected successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect wallet';
        showError(message);
        console.error('Wallet connection error:', error);
      }
    },
    [wagmiConnect, connectors, showError, showSuccess]
  );

  const disconnect = useCallback(() => {
    try {
      wagmiDisconnect();
      showSuccess('Wallet disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect wallet';
      showError(message);
    }
  }, [wagmiDisconnect, showError, showSuccess]);

  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      try {
        if (!wagmiSwitchChain) {
          showError('Network switching not available');
          return;
        }

        wagmiSwitchChain({ chainId: targetChainId });
        showSuccess(`Switched to network: ${getChainName(targetChainId)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to switch network';
        showError(message);
        logger.error('Network switch error', error instanceof Error ? error : new Error(String(error)), 'Wallet');
      }
    },
    [wagmiSwitchChain, showError, showSuccess]
  );

  return {
    address,
    isConnected: isConnected ?? false,
    isConnecting: isConnecting || isSwitching,
    chainId,
    chainName: chainId ? getChainName(chainId) : undefined,
    connect,
    disconnect,
    switchNetwork,
    error: connectError ?? null,
  };
}
