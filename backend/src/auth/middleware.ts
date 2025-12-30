import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';
import { verifyToken } from './jwt';

export const getUserFromToken = async (ctx: Context) => {
  // Try to get token from httpOnly cookie first (preferred)
  let token = ctx.req.cookies?.auth_token;

  // Fallback to Authorization header for backward compatibility
  if (!token) {
    const authHeader = ctx.req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No token provided' });
  }

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
