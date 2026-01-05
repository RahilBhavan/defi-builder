/**
 * Tests for logger utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    logger.info('Test message', 'TestContext');
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it('should log warning messages', () => {
    logger.warn('Warning message', 'TestContext');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Error message', error, 'TestContext');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should log debug messages in development', () => {
    logger.debug('Debug message', 'TestContext');
    // Debug may or may not log depending on environment
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it('should include context in log messages', () => {
    logger.info('Test message', 'TestContext');
    const callArgs = consoleSpy.info.mock.calls[0];
    expect(callArgs[0]).toContain('TestContext');
  });

  it('should handle errors without context', () => {
    const error = new Error('Test error');
    logger.error('Error message', error);
    expect(consoleSpy.error).toHaveBeenCalled();
  });
});
