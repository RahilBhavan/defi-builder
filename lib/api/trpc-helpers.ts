/**
 * Type-safe helpers for tRPC router access
 *
 * This file provides type helpers to ensure proper type inference
 * for the tRPC router, especially for nested routers like marketplace and ai.
 */

import type { AppRouter } from '../../backend/src/trpc/router';

/**
 * Type helper to safely access nested routers
 * This ensures TypeScript properly infers the router type
 */
export type SafeRouterAccess<T extends keyof AppRouter> = AppRouter[T] extends infer R ? R : never;

/**
 * Type-safe access to marketplace router
 */
export type MarketplaceRouter = SafeRouterAccess<'marketplace'>;

/**
 * Type-safe access to ai router
 */
export type AIRouter = SafeRouterAccess<'ai'>;
