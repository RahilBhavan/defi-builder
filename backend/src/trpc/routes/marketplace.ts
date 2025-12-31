import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';

export const marketplaceRouter = router({
  // Get public strategies with pagination and filtering
  discover: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sortBy: z.enum(['newest', 'popular', 'trending', 'rating']).default('newest'),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { page, limit, category, tags, sortBy, search } = input;
        const skip = (page - 1) * limit;

        const where: any = {
          isPublic: true,
        };

        if (category) {
          where.category = category;
        }

        if (tags && tags.length > 0) {
          // SQLite doesn't support JSON queries well, so we'll do a simple string match
          // In production with PostgreSQL, use proper JSON queries
          where.tags = {
            contains: JSON.stringify(tags[0]), // Simplified for SQLite
          };
        }

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        const orderBy: any = {};
        switch (sortBy) {
          case 'newest':
            orderBy.createdAt = 'desc';
            break;
          case 'popular':
            orderBy.viewCount = 'desc';
            break;
          case 'trending':
            // Trending = recent views + likes
            orderBy.likeCount = 'desc';
            orderBy.viewCount = 'desc';
            break;
          case 'rating':
            // Would need aggregation for average rating
            orderBy.likeCount = 'desc';
            break;
        }

        const [strategies, total] = await Promise.all([
          prisma.strategy.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                  username: true,
                  avatarUrl: true,
                },
              },
              _count: {
                select: {
                  ratings: true,
                  reviews: true,
                  forks: true,
                },
              },
            },
          }),
          prisma.strategy.count({ where }),
        ]);

        // Calculate average ratings
        const strategiesWithRatings = await Promise.all(
          strategies.map(async (strategy) => {
            const ratings = await prisma.rating.findMany({
              where: { strategyId: strategy.id },
              select: { rating: true },
            });

            const avgRating =
              ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0;

            return {
              ...strategy,
              averageRating: avgRating,
              ratingCount: ratings.length,
            };
          })
        );

        return {
          strategies: strategiesWithRatings,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        logger.error('Error discovering strategies', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to discover strategies');
      }
    }),

  // Get featured strategies
  featured: publicProcedure.query(async () => {
    try {
      const strategies = await prisma.strategy.findMany({
        where: {
          isPublic: true,
          isFeatured: true,
        },
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              username: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              ratings: true,
              reviews: true,
              forks: true,
            },
          },
        },
      });

      return strategies;
    } catch (error) {
      logger.error('Error fetching featured strategies', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
      throw new Error('Failed to fetch featured strategies');
    }
  }),

  // Get strategy details
  getStrategy: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const strategy = await prisma.strategy.findUnique({
          where: { id: input.id },
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                username: true,
                avatarUrl: true,
                bio: true,
              },
            },
            ratings: {
              include: {
                user: {
                  select: {
                    id: true,
                    walletAddress: true,
                    username: true,
                  },
                },
              },
            },
            reviews: {
              include: {
                user: {
                  select: {
                    id: true,
                    walletAddress: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
            },
            _count: {
              select: {
                forks: true,
              },
            },
          },
        });

        if (!strategy || !strategy.isPublic) {
          throw new Error('Strategy not found');
        }

        // Increment view count
        await prisma.strategy.update({
          where: { id: input.id },
          data: { viewCount: { increment: 1 } },
        });

        // Calculate average rating
        const avgRating =
          strategy.ratings.length > 0
            ? strategy.ratings.reduce((sum, r) => sum + r.rating, 0) / strategy.ratings.length
            : 0;

        return {
          ...strategy,
          averageRating: avgRating,
        };
      } catch (error) {
        logger.error('Error fetching strategy', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to fetch strategy');
      }
    }),

  // Rate a strategy
  rateStrategy: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        rating: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Upsert rating (update if exists, create if not)
        const rating = await prisma.rating.upsert({
          where: {
            strategyId_userId: {
              strategyId: input.strategyId,
              userId,
            },
          },
          update: {
            rating: input.rating,
            updatedAt: new Date(),
          },
          create: {
            strategyId: input.strategyId,
            userId,
            rating: input.rating,
          },
        });

        // Update strategy like count (simplified - using rating as like)
        await prisma.strategy.update({
          where: { id: input.strategyId },
          data: { likeCount: { increment: 1 } },
        });

        return rating;
      } catch (error) {
        logger.error('Error rating strategy', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to rate strategy');
      }
    }),

  // Add a review
  addReview: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        content: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const review = await prisma.review.create({
          data: {
            strategyId: input.strategyId,
            userId,
            content: input.content,
          },
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        return review;
      } catch (error) {
        logger.error('Error adding review', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to add review');
      }
    }),

  // Fork a strategy
  forkStrategy: protectedProcedure
    .input(
      z.object({
        originalId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Get original strategy
        const original = await prisma.strategy.findUnique({
          where: { id: input.originalId },
        });

        if (!original || !original.isPublic) {
          throw new Error('Strategy not found or not public');
        }

        // Create forked strategy
        const forked = await prisma.strategy.create({
          data: {
            userId,
            name: input.name,
            description: input.description || original.description,
            nodeGraph: original.nodeGraph,
            isPublic: false, // Forked strategies are private by default
            category: original.category,
            tags: original.tags,
          },
        });

        // Create fork relationship
        await prisma.strategyFork.create({
          data: {
            originalId: input.originalId,
            forkedId: forked.id,
            userId,
          },
        });

        // Increment fork count on original
        await prisma.strategy.update({
          where: { id: input.originalId },
          data: { forkCount: { increment: 1 } },
        });

        return forked;
      } catch (error) {
        logger.error('Error forking strategy', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to fork strategy');
      }
    }),

  // Make strategy public/private
  updateVisibility: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        isPublic: z.boolean(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const strategy = await prisma.strategy.findFirst({
          where: {
            id: input.strategyId,
            userId,
          },
        });

        if (!strategy) {
          throw new Error('Strategy not found or unauthorized');
        }

        const updated = await prisma.strategy.update({
          where: { id: input.strategyId },
          data: {
            isPublic: input.isPublic,
            category: input.category,
            tags: input.tags ? JSON.stringify(input.tags) : undefined,
          },
        });

        return updated;
      } catch (error) {
        logger.error('Error updating strategy visibility', error instanceof Error ? error : new Error(String(error)), 'Marketplace');
        throw new Error('Failed to update strategy visibility');
      }
    }),
});

