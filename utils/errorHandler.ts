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
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timed out. The server is taking too long to respond. Please try again.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('token')) {
      return 'Authentication failed. Please reconnect your wallet and try again.';
    }

    // Server errors
    if (message.includes('500') || message.includes('internal server error')) {
      return 'Server error occurred. Our team has been notified. Please try again later.';
    }

    // API key errors
    if (message.includes('api key') || message.includes('invalid key')) {
      return 'API configuration error. Please check your settings.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid input. Please check your strategy configuration.';
    }

    // Default error message
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
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

