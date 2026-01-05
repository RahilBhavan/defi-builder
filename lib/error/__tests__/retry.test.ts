/**
 * Tests for retry utility with exponential backoff
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RetryError, isRetryableError, retryWithBackoff } from '../retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 100,
    });

    // Fast-forward timers
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw RetryError after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Persistent error'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 100,
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow(RetryError);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should respect retryable function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Validation error'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 100,
      retryable: (error) => {
        return !error.message.includes('Validation');
      },
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Validation error');
    expect(fn).toHaveBeenCalledTimes(1); // Should not retry
  });

  it('should respect abort signal', async () => {
    const abortController = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error('Error'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 5,
      initialDelay: 100,
      signal: abortController.signal,
    });

    // Abort immediately
    abortController.abort();
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Operation cancelled');
    // May be called once before abort is detected
    expect(fn).toHaveBeenCalled();
  });
});

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    expect(isRetryableError(new Error('Network request failed'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('should identify validation errors as non-retryable', () => {
    expect(isRetryableError(new Error('Validation failed'))).toBe(false);
    expect(isRetryableError(new Error('Invalid input'))).toBe(false);
  });

  it('should identify 5xx errors as retryable', () => {
    const error = new Error('Server error');
    (error as any).status = 500;
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify 4xx errors as non-retryable', () => {
    const error = new Error('Bad request');
    (error as any).status = 400;
    expect(isRetryableError(error)).toBe(false);
  });
});
