import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../backend/src/trpc/router';

// Create tRPC React client with proper type inference
// Using type assertion to work around TypeScript inference issues
// This ensures the router type is properly recognized
export const trpc = createTRPCReact<AppRouter>() as ReturnType<typeof createTRPCReact<AppRouter>>;
