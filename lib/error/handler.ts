/**
 * Centralized Error Handling Utilities
 * Provides user-friendly error messages and retry logic
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Get user-friendly error message from various error types
 * @param error - The error object or string
 * @param context - Optional context for more specific error messages
 * @returns User-friendly error message with actionable guidance
 */
export function getUserFriendlyErrorMessage(error: unknown, context?: string): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return context === 'save'
        ? 'Unable to save your strategy. Please check your internet connection and try again.'
        : context === 'load'
          ? 'Unable to load data. Please check your internet connection and try again.'
          : 'Network connection failed. Please check your internet connection and try again.';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return context === 'backtest'
        ? 'Backtest is taking longer than expected. Try reducing the date range or simplifying your strategy.'
        : context === 'optimization'
          ? 'Optimization is taking too long. Try reducing the number of iterations or objectives.'
          : 'Request timed out. The server is taking too long to respond. Please try again.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('token')) {
      return 'Your session has expired. Please reconnect your wallet and try again.';
    }

    // Server errors
    if (message.includes('500') || message.includes('internal server error')) {
      return 'A server error occurred. Our team has been notified. Please try again in a few moments.';
    }

    // API key errors
    if (message.includes('api key') || message.includes('invalid key')) {
      return 'API configuration error. Please check your settings or contact support if the issue persists.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return context === 'strategy'
        ? 'Your strategy configuration is invalid. Please check that all blocks are properly configured.'
        : 'Invalid input. Please check your configuration and try again.';
    }

    // File/Import errors
    if (message.includes('file') || message.includes('import') || message.includes('parse')) {
      return 'Unable to import the file. Please ensure it\'s a valid strategy file and try again.';
    }

    // Export errors
    if (message.includes('export') || message.includes('download')) {
      return 'Unable to export your strategy. Please try again or use the share feature instead.';
    }

    // Strategy execution errors
    if (message.includes('execution') || message.includes('execute') || message.includes('simulation')) {
      return 'Strategy execution failed. Please verify your strategy is valid and all required parameters are set.';
    }

    // Backtest errors
    if (message.includes('backtest')) {
      return 'Backtest failed. Please check your strategy configuration and date range, then try again.';
    }

    // Optimization errors
    if (message.includes('optimization') || message.includes('optimize')) {
      return 'Optimization failed. Try adjusting your objectives or reducing the search space.';
    }

    // Database/storage errors
    if (message.includes('database') || message.includes('storage') || message.includes('save')) {
      return 'Unable to save your data. Please try again. If the problem persists, check your browser storage settings.';
    }

    // Default error message - try to make it more user-friendly
    const defaultMessage = error.message || 'An unexpected error occurred';
    return `${defaultMessage}. Please try again. If the problem persists, refresh the page.`;
  }

  if (typeof error === 'string') {
    // If it's already a user-friendly string, return it
    return error;
  }

  return 'An unexpected error occurred. Please try again. If the problem persists, refresh the page.';
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;

      // Call onRetry callback if provided
      if (onRetry && error instanceof Error) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Retryable errors
  const retryablePatterns = [
    'network',
    'timeout',
    'fetch',
    'connection',
    'econnrefused',
    'etimedout',
    'rate limit',
    '429',
    '503', // Service unavailable
    '502', // Bad gateway
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  const errorStr = error instanceof Error ? error.stack || error.message : String(error);
  return `${timestamp} ${contextStr}${errorStr}`;
}
