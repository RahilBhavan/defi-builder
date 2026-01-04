/**
 * Transaction Executor Service
 * Handles on-chain transaction execution with proper error handling and status tracking
 */

import { http, type Address, type Hash, type WalletClient, createPublicClient } from 'viem';
import { arbitrum, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';
import { logger } from '../../lib/monitoring/logger';
import { type GasEstimate, estimateGas } from './gasEstimator';

export interface TransactionRequest {
  to: Address;
  data?: `0x${string}`;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export interface TransactionResult {
  hash: Hash;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  error?: string;
}

export interface TransactionStatus {
  hash: Hash;
  status: 'pending' | 'success' | 'failed' | 'replaced';
  blockNumber?: bigint;
  confirmations: number;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

/**
 * Get public client for a chain
 */
function getPublicClient(chainId: number) {
  const chains = {
    [sepolia.id]: sepolia,
    [mainnet.id]: mainnet,
    [polygon.id]: polygon,
    [arbitrum.id]: arbitrum,
    [optimism.id]: optimism,
  };
  const chain = chains[chainId as keyof typeof chains];

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
}

/**
 * Execute a transaction on-chain
 * Note: This requires a wallet client to be passed in or accessed via wagmi hooks
 */
export async function executeTransaction(
  chainId: number,
  account: Address,
  transaction: TransactionRequest,
  walletClient: WalletClient,
  speed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard'
): Promise<TransactionResult> {
  try {
    const publicClient = getPublicClient(chainId);

    if (!walletClient || !publicClient) {
      throw new Error(`No wallet or public client for chain ${chainId}`);
    }

    // Estimate gas if not provided
    let gasEstimate: GasEstimate;
    if (!transaction.gasLimit) {
      gasEstimate = await estimateGas(
        chainId,
        {
          to: transaction.to,
          from: account,
          data: transaction.data,
          value: transaction.value,
        },
        speed
      );
      transaction.gasLimit = gasEstimate.gasLimit;
    }

    // Get gas prices if not provided
    if (!transaction.gasPrice && !transaction.maxFeePerGas) {
      gasEstimate = await estimateGas(
        chainId,
        {
          to: transaction.to,
          from: account,
          data: transaction.data,
          value: transaction.value,
        },
        speed
      );

      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        transaction.maxFeePerGas = gasEstimate.maxFeePerGas;
        transaction.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
      } else {
        transaction.gasPrice = gasEstimate.gasPrice;
      }
    }

    // Send transaction
    logger.info('Sending transaction', 'TransactionExecutor', {
      to: transaction.to,
      chainId,
      gasLimit: transaction.gasLimit?.toString(),
    });

    // Ensure gasLimit has a value before sending
    const gasLimit = transaction.gasLimit ?? 21000n;

    // Build transaction parameters - viem types are complex, use type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Biome-ignore lint/suspicious/noExplicitAny: viem types are complex, type assertion needed for wallet compatibility
    const hash = await walletClient.sendTransaction({
      account,
      chain: undefined, // Let the wallet determine the chain
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
      gas: gasLimit,
      ...(transaction.gasPrice ? { gasPrice: transaction.gasPrice } : {}),
      ...(transaction.maxFeePerGas ? { maxFeePerGas: transaction.maxFeePerGas } : {}),
      ...(transaction.maxPriorityFeePerGas
        ? { maxPriorityFeePerGas: transaction.maxPriorityFeePerGas }
        : {}),
    } as any);

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    logger.info('Transaction confirmed', 'TransactionExecutor', {
      hash,
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    });

    return {
      hash,
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Transaction execution failed',
      error instanceof Error ? error : new Error(errorMessage),
      'TransactionExecutor'
    );

    // Try to extract transaction hash from error
    const hashMatch = errorMessage.match(/0x[a-fA-F0-9]{64}/);
    const hash = hashMatch ? (hashMatch[0] as Hash) : undefined;

    return {
      hash: hash || ('0x' as Hash),
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  chainId: number,
  hash: Hash
): Promise<TransactionStatus> {
  try {
    const publicClient = getPublicClient(chainId);

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const transaction = await publicClient.getTransaction({ hash });
    const currentBlock = await publicClient.getBlockNumber();

    if (receipt) {
      return {
        hash,
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        confirmations: Number(currentBlock - receipt.blockNumber),
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
    }
    if (transaction) {
      return {
        hash,
        status: 'pending',
        confirmations: 0,
      };
    }
    return {
      hash,
      status: 'failed',
      confirmations: 0,
    };
  } catch (error) {
    logger.error(
      'Failed to get transaction status',
      error instanceof Error ? error : new Error(String(error)),
      'TransactionExecutor'
    );
    return {
      hash,
      status: 'failed',
      confirmations: 0,
    };
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  chainId: number,
  hash: Hash,
  confirmations = 1
): Promise<TransactionStatus> {
  try {
    const publicClient = getPublicClient(chainId);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations,
    });

    const currentBlock = await publicClient.getBlockNumber();

    return {
      hash,
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      confirmations: Number(currentBlock - receipt.blockNumber),
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
    };
  } catch (error) {
    logger.error(
      'Failed to wait for transaction',
      error instanceof Error ? error : new Error(String(error)),
      'TransactionExecutor'
    );
    return {
      hash,
      status: 'failed',
      confirmations: 0,
    };
  }
}
