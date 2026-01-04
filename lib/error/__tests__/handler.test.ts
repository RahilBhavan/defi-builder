/**
 * Tests for error handler utilities
 */

import { describe, expect, it } from 'vitest';
import { getUserFriendlyErrorMessage } from '../handler';

describe('getUserFriendlyErrorMessage', () => {
  it('should return user-friendly message for network errors', () => {
    const error = new Error('Network request failed');
    expect(getUserFriendlyErrorMessage(error)).toContain('network');
  });

  it('should return user-friendly message for validation errors', () => {
    const error = new Error('Validation failed');
    expect(getUserFriendlyErrorMessage(error)).toContain('validation');
  });

  it('should return user-friendly message for timeout errors', () => {
    const error = new Error('Request timeout');
    expect(getUserFriendlyErrorMessage(error)).toContain('timeout');
  });

  it('should return generic message for unknown errors', () => {
    const error = new Error('Unknown error');
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBeTruthy();
    expect(typeof message).toBe('string');
  });

  it('should handle error objects with status codes', () => {
    const error: any = new Error('Server error');
    error.status = 500;
    expect(getUserFriendlyErrorMessage(error)).toBeTruthy();
  });

  it('should handle non-Error objects', () => {
    expect(getUserFriendlyErrorMessage('string error')).toBeTruthy();
    expect(getUserFriendlyErrorMessage(null)).toBeTruthy();
    expect(getUserFriendlyErrorMessage(undefined)).toBeTruthy();
  });
});

