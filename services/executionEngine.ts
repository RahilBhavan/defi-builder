import { LegoBlock } from '../types';
import { runDeFiBacktest, DeFiBacktestResult } from './defiBacktestEngine';
import { retryWithBackoff, isRetryableError } from '../utils/retry';

export class BacktestExecutionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly actionable?: string
  ) {
    super(message);
    this.name = 'BacktestExecutionError';
  }
}

/**
 * Executes a strategy by running a backtest with error handling and retry logic
 * @param blocks - Array of blocks representing the strategy
 * @returns Promise resolving to backtest results
 * @throws BacktestExecutionError if execution fails
 */
export const executeStrategy = async (
  blocks: LegoBlock[]
): Promise<DeFiBacktestResult> => {
  // Validate blocks array
  if (!blocks || blocks.length === 0) {
    throw new BacktestExecutionError(
      'Cannot execute an empty strategy',
      undefined,
      'Please add at least one block to your strategy before executing.'
    );
  }

  // Validate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // 6 months back

  if (startDate >= endDate) {
    throw new BacktestExecutionError(
      'Invalid date range for backtest',
      undefined,
      'Start date must be before end date. Please check your system clock.'
    );
  }

  try {
    const result = await retryWithBackoff(
      async () => {
        return await runDeFiBacktest({
          blocks,
          startDate,
          endDate,
          initialCapital: 10000,
          rebalanceInterval: 86400000, // 1 day in ms
        });
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        retryable: (error) => {
          // Retry on network/timeout errors, but not on validation errors
          if (error instanceof BacktestExecutionError) {
            return false;
          }
          return isRetryableError(error);
        },
      }
    );

    return result;
  } catch (error) {
    // Handle specific error types
    if (error instanceof BacktestExecutionError) {
      throw error;
    }

    // Handle retry exhaustion
    if (error instanceof Error && error.name === 'RetryError') {
      throw new BacktestExecutionError(
        'Backtest execution failed after multiple attempts',
        error,
        'The backtest engine encountered persistent errors. Please check your strategy configuration and try again.'
      );
    }

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new BacktestExecutionError(
        'Backtest execution timed out',
        error,
        'The backtest is taking too long. Try reducing the date range or simplifying your strategy.'
      );
    }

    // Handle unknown errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new BacktestExecutionError(
      `Backtest execution failed: ${errorMessage}`,
      error,
      'An unexpected error occurred. Please check the console for details and try again.'
    );
  }
};
