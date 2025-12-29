/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryable?: (error: unknown) => boolean;
  signal?: AbortSignal;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retries an async function with exponential backoff
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws RetryError if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retryable = () => true,
    signal,
  } = options;

  let lastError: unknown;
  let attempts = 0;

  while (attempts <= maxRetries) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Operation cancelled');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempts++;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempts > maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(2, attempts - 1),
        maxDelay
      );

      // Wait before retrying
      await new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, delay);
        
        // Cancel timeout if signal is aborted
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve(undefined);
          });
        }
      });

      // Check again after delay
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }
    }
  }

  // All retries exhausted
  const errorMessage =
    lastError instanceof Error
      ? lastError.message
      : 'Unknown error occurred';
  
  throw new RetryError(
    `Operation failed after ${attempts} attempts: ${errorMessage}`,
    attempts,
    lastError
  );
}

/**
 * Determines if an error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true; // Retry unknown errors by default
  }

  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'network',
    'timeout',
    'rate limit',
    'temporary',
    'econnreset',
    'etimedout',
    'eai_again',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

