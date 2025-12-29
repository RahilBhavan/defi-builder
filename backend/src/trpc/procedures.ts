import { getUserFromToken } from '../auth/middleware';
import { publicProcedure } from './index';

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const user = await getUserFromToken(ctx);
  return next({
    ctx: {
      ...ctx,
      user, // Now available in all protected procedures
    },
  });
});
