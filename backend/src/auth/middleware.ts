import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';
import { verifyToken } from './jwt';

export const getUserFromToken = async (ctx: Context) => {
  const authHeader = ctx.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  const user = await ctx.prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  }

  return user;
};
