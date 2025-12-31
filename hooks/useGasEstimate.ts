/**
 * Hook for gas estimation
 * Provides real-time gas price data and transaction cost estimates
 */

import { useQuery } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import { getGasPrices, estimateGas, type GasEstimate } from '../services/web3/gasEstimator';
import type { Address } from 'viem';

export interface UseGasEstimateOptions {
  transaction?: {
    to?: Address;
    from?: Address;
    data?: `0x${string}`;
    value?: bigint;
  };
  speed?: 'slow' | 'standard' | 'fast' | 'instant';
  enabled?: boolean;
}

/**
 * Hook to get current gas prices
 */
export function useGasPrices(speed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard') {
  const chainId = useChainId();

  return useQuery({
    queryKey: ['gasPrices', chainId, speed],
    queryFn: () => getGasPrices(chainId),
    enabled: !!chainId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
}

/**
 * Hook to estimate gas for a transaction
 */
export function useGasEstimate(options: UseGasEstimateOptions = {}) {
  const chainId = useChainId();
  const { transaction, speed = 'standard', enabled = true } = options;

  return useQuery({
    queryKey: ['gasEstimate', chainId, transaction, speed],
    queryFn: () => {
      if (!transaction) {
        throw new Error('Transaction required for gas estimation');
      }
      return estimateGas(chainId, transaction, speed);
    },
    enabled: enabled && !!chainId && !!transaction,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

