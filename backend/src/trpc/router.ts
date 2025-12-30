import { z } from 'zod';
import { signToken } from '../auth/jwt';
import redis from '../cache/redis';
import { getAISuggestions, getProtocolDocumentation } from '../services/ai';
import { getTokenPrices } from '../services/priceFeed';
import { publicProcedure, router } from './index';
import { protectedProcedure } from './procedures';

export const appRouter = router({
  health: publicProcedure.query(async () => {
    try {
      await redis.ping();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: 'connected',
      };
    } catch (error) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        redis: 'disconnected',
      };
    }
  }),

  // Auth endpoints
  auth: router({
    login: publicProcedure
      .input(
        z.object({
          walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Find or create user
        let user = await ctx.prisma.user.findUnique({
          where: { walletAddress: input.walletAddress },
        });

        if (!user) {
          user = await ctx.prisma.user.create({
            data: { walletAddress: input.walletAddress },
          });
        }

        const accessToken = signToken({
          userId: user.id,
          walletAddress: user.walletAddress,
        });
        const refreshToken = signToken(
          {
            userId: user.id,
            walletAddress: user.walletAddress,
          },
          true
        );

        // Set httpOnly cookies
        ctx.res.cookie('auth_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        ctx.res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
        });

        // Return user (tokens are in cookies, not in response)
        return { user };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Clear the auth cookies
      ctx.res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      ctx.res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      return { success: true };
    }),

    refresh: publicProcedure.mutation(async ({ ctx }) => {
      const refreshToken = ctx.req.cookies?.refresh_token;
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const newAccessToken = refreshAccessToken(refreshToken);
      if (!newAccessToken) {
        // Invalid refresh token - clear cookies
        ctx.res.clearCookie('auth_token');
        ctx.res.clearCookie('refresh_token');
        throw new Error('Invalid or expired refresh token');
      }

      // Set new access token
      ctx.res.cookie('auth_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      return { success: true };
    }),

    me: protectedProcedure.query(({ ctx }) => {
      return ctx.user;
    }),
  }),

  // Strategy endpoints
  strategies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const strategies = await ctx.prisma.strategy.findMany({
        where: { userId: ctx.user.id },
        orderBy: { updatedAt: 'desc' },
      });

      // Parse JSON strings back to objects
      return strategies.map((strategy) => ({
        ...strategy,
        nodeGraph: JSON.parse(strategy.nodeGraph || '{}'),
      }));
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          nodeGraph: z.any(), // ReactFlow node graph JSON
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.strategy.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            description: input.description,
            nodeGraph: JSON.stringify(input.nodeGraph || {}),
          },
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          nodeGraph: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input;
        const data: Record<string, unknown> = { ...updateData };

        // Stringify nodeGraph if provided
        if (data.nodeGraph !== undefined) {
          data.nodeGraph = JSON.stringify(data.nodeGraph);
        }

        return ctx.prisma.strategy.update({
          where: { id },
          data,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.strategy.delete({
          where: { id: input.id },
        });
      }),
  }),

  // AI endpoints
  ai: router({
    getSuggestions: protectedProcedure
      .input(
        z.object({
          currentBlocks: z.array(z.any()),
          query: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return getAISuggestions(input.currentBlocks, input.query);
      }),

    getProtocolDocs: publicProcedure
      .input(z.object({ protocol: z.string() }))
      .query(async ({ input }) => {
        return getProtocolDocumentation(input.protocol);
      }),
  }),

  // Price feed endpoints (proxy for CoinGecko)
  prices: router({
    getPrices: publicProcedure
      .input(
        z.object({
          tokens: z.array(z.string()).min(1).max(50), // Limit to 50 tokens per request
        })
      )
      .query(async ({ input }) => {
        return getTokenPrices(input.tokens);
      }),
  }),

  // Strategy sharing endpoints
  sharing: router({
    generateShareToken: publicProcedure
      .input(
        z.object({
          strategy: z.object({
            name: z.string().min(1).max(100),
            blocks: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                label: z.string(),
                description: z.string(),
                category: z.string(),
                protocol: z.string(),
                icon: z.string(),
                params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
              })
            ),
            createdAt: z.number(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { generateShareToken } = await import('../utils/strategySharing');
        return { token: generateShareToken(input.strategy) };
      }),

    parseShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const { verifyShareToken } = await import('../utils/strategySharing');
        const payload = verifyShareToken(input.token);
        if (!payload) {
          throw new Error('Invalid or expired share token');
        }
        return payload.strategy;
      }),
  }),
});

export type AppRouter = typeof appRouter;
