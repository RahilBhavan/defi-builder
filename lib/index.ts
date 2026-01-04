/**
 * Shared library utilities
 *
 * Central export point for all shared utilities
 *
 * Usage:
 *   import { trpc, trpcClient } from '@/lib/api';
 *   import { validateNumberRange } from '@/lib/validation';
 *   import { getUserFriendlyErrorMessage } from '@/lib/error';
 */

// Re-export all utilities for convenience
export * from './api';
export * from './validation';
export * from './error';
export * from './storage';
export * from './monitoring';
export * from './format';
export * from './spine';
