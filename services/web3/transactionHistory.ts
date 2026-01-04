/**
 * Transaction History Service
 * Tracks and stores on-chain transaction history
 */

import type { Hash } from 'viem';
import { type TransactionStatus, getTransactionStatus } from './transactionExecutor';

export interface TransactionRecord {
  hash: Hash;
  chainId: number;
  from: string;
  to: string;
  value: string;
  data?: string;
  timestamp: number;
  status: TransactionStatus['status'];
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  label?: string; // User-friendly label (e.g., "Uniswap Swap", "Aave Supply")
}

const STORAGE_KEY = 'defi-builder-transaction-history';
const MAX_HISTORY_SIZE = 1000; // Keep last 1000 transactions

/**
 * Get transaction history from localStorage
 */
export function getTransactionHistory(): TransactionRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as TransactionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save transaction to history
 */
export function saveTransaction(transaction: TransactionRecord): void {
  try {
    const history = getTransactionHistory();

    // Remove duplicate if exists
    const filtered = history.filter((t) => t.hash !== transaction.hash);

    // Add new transaction at the beginning
    const updated = [transaction, ...filtered];

    // Limit history size
    const limited = updated.slice(0, MAX_HISTORY_SIZE);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    // Silently fail - transaction history is not critical
    console.error('[TransactionHistory] Failed to save transaction to history:', error);
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  chainId: number,
  hash: Hash
): Promise<TransactionRecord | null> {
  try {
    const history = getTransactionHistory();
    const transaction = history.find((t) => t.hash === hash && t.chainId === chainId);

    if (!transaction) {
      return null;
    }

    const status = await getTransactionStatus(chainId, hash);

    const updated: TransactionRecord = {
      ...transaction,
      status: status.status,
      blockNumber: status.blockNumber,
      gasUsed: status.gasUsed,
      effectiveGasPrice: status.effectiveGasPrice,
    };

    // Update in history
    const updatedHistory = history.map((t) =>
      t.hash === hash && t.chainId === chainId ? updated : t
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

    return updated;
  } catch {
    return null;
  }
}

/**
 * Get transactions for a specific address
 */
export function getTransactionsByAddress(address: string): TransactionRecord[] {
  const history = getTransactionHistory();
  return history.filter((t) => t.from.toLowerCase() === address.toLowerCase());
}

/**
 * Get transactions for a specific chain
 */
export function getTransactionsByChain(chainId: number): TransactionRecord[] {
  const history = getTransactionHistory();
  return history.filter((t) => t.chainId === chainId);
}

/**
 * Clear transaction history
 */
export function clearTransactionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
