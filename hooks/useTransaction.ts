/**
 * Hook for transaction execution and tracking
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { executeTransaction, getTransactionStatus, waitForTransaction, type TransactionRequest, type TransactionResult } from '../services/web3/transactionExecutor';
import { useToast } from './useToast';
import type { Hash } from 'viem';

/**
 * Hook to execute a transaction
 */
export function useExecuteTransaction() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { success: showSuccess, error: showError } = useToast();

  return useMutation({
    mutationFn: async ({
      transaction,
      speed = 'standard',
    }: {
      transaction: TransactionRequest;
      speed?: 'slow' | 'standard' | 'fast' | 'instant';
    }): Promise<TransactionResult> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      if (!chainId) {
        throw new Error('Chain not connected');
      }
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      return executeTransaction(chainId, address, transaction, walletClient, speed);
    },
    onSuccess: (result) => {
      if (result.status === 'success') {
        showSuccess(`Transaction confirmed: ${result.hash.slice(0, 10)}...`);
      } else {
        showError(`Transaction failed: ${result.error || 'Unknown error'}`);
      }
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Transaction failed');
    },
  });
}

/**
 * Hook to get transaction status
 */
export function useTransactionStatus(hash: Hash | undefined) {
  const chainId = useChainId();

  return useQuery({
    queryKey: ['transactionStatus', chainId, hash],
    queryFn: () => {
      if (!hash || !chainId) {
        throw new Error('Hash and chainId required');
      }
      return getTransactionStatus(chainId, hash);
    },
    enabled: !!hash && !!chainId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop refetching if transaction is confirmed or failed
      if (status === 'success' || status === 'failed') {
        return false;
      }
      // Refetch every 3 seconds for pending transactions
      return 3000;
    },
  });
}

/**
 * Hook to wait for transaction confirmation
 */
export function useWaitForTransaction(hash: Hash | undefined, confirmations: number = 1) {
  const chainId = useChainId();
  const { success: showSuccess, error: showError } = useToast();

  return useMutation({
    mutationFn: async (): Promise<Awaited<ReturnType<typeof waitForTransaction>>> => {
      if (!hash || !chainId) {
        throw new Error('Hash and chainId required');
      }
      return waitForTransaction(chainId, hash, confirmations);
    },
    onSuccess: (result) => {
      if (result.status === 'success') {
        showSuccess(`Transaction confirmed with ${result.confirmations} confirmations`);
      } else {
        showError('Transaction failed');
      }
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Failed to wait for transaction');
    },
  });
}

