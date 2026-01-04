import { TRPCError, initTRPC } from '@trpc/server';
import { getUserFromToken } from '../auth/middleware';
import type { Context } from './context';
import { logger } from '../utils/logger';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // Log server errors for debugging
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(
        'tRPC Internal Server Error',
        error.cause instanceof Error ? error.cause : new Error(error.message),
        'tRPC'
      );
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  try {
    const user = await getUserFromToken(ctx);
    return next({
      ctx: {
        ...ctx,
        user, // Now available in all protected procedures
      },
    });
  } catch (error) {
    // Re-throw TRPCErrors as-is (they have proper error codes)
    if (error instanceof TRPCError) {
      throw error;
    }
    // Wrap unexpected errors
    logger.error(
      'Unexpected error in protectedProcedure',
      error instanceof Error ? error : new Error(String(error)),
      'Auth'
    );
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Authentication failed',
      cause: error,
    });
  }
});

// Optional procedure that returns null if not authenticated
export const optionalAuthProcedure = publicProcedure.use(async ({ ctx, next }) => {
  try {
    const user = await getUserFromToken(ctx);
    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  } catch {
    // Return null user if not authenticated
    return next({
      ctx: {
        ...ctx,
        user: null,
      },
    });
  }
});
