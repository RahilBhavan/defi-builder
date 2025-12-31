/**
 * Backward compatibility exports
 * 
 * This file maintains backward compatibility with existing imports
 * while encouraging migration to the new lib/ structure
 * 
 * @deprecated Use imports from '@/lib/*' instead
 * Example: import { trpc } from '@/lib/api' instead of '@/utils/trpc'
 */

// API utilities
export { trpc } from '../lib/api/trpc';
export { trpcClient } from '../lib/api/client';
export type { SafeRouterAccess } from '../lib/api/helpers';

// Validation
export * from '../lib/validation';

// Error handling
export * from '../lib/error/handler';
export * from '../lib/error/retry';

// Storage
export * from '../lib/storage/json';
export * from '../lib/storage/services/backup';
export * from '../lib/storage/services/migrations';
export * from '../lib/storage/services/versioning';

// Monitoring
export * from '../lib/monitoring/logger';
export * from '../lib/monitoring/monitoring';
export * from '../lib/monitoring/rateLimiter';

// Format
export * from '../lib/format/csv';
export * from '../lib/format/metrics';

// Spine
export * from '../lib/spine/reactflow';

