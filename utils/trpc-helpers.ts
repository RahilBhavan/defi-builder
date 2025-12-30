/**
 * Type-safe helpers for tRPC router access
 * 
 * NOTE: These helpers use type assertions due to tRPC version mismatch:
 * - Backend: @trpc/server v10.45.0
 * - Frontend: @trpc/client/@trpc/react-query v11.8.1
 * 
 * TODO: Upgrade backend to @trpc/server v11 to match frontend and remove type assertions
 */

import type { AppRouter } from '../backend/src/trpc/router';

/**
 * Type helper to safely access nested routers
 * Uses 'as unknown as' instead of 'as any' for better type safety
 */
export type SafeRouterAccess<T extends keyof AppRouter> = AppRouter[T] extends infer R
  ? R
  : never;

