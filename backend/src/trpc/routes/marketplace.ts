import { z } from 'zod';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { protectedProcedure, publicProcedure, router } from '../index';

/**
 * Calculate trending score for a strategy
 * Trending = (recent views * 0.3) + (recent likes * 0.4) + (recent forks * 0.3)
 * Recent = last 7 days
 */
async function calculateTrendingScore(strategy: {
  id: string;
  viewCount: number;
  likeCount: number;
  forkCount: number;
  createdAt: Date;
  updatedAt: Date;
}): Promise<number> {
  // For now, use a simplified trending algorithm
  // In production, track views/likes/forks over time windows
  const daysSinceCreation = (Date.now() - strategy.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0, 1 - daysSinceCreation / 30); // Decay over 30 days

  // Weighted score
  const score = strategy.viewCount * 0.3 + strategy.likeCount * 0.4 + strategy.forkCount * 0.3;

  // Apply recency factor
  return score * (1 + recencyFactor * 0.5);
}

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

        // biome-ignore lint/suspicious/noExplicitAny: Prisma where clause type is complex and inferred
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

        // Get all strategies first for trending calculation
        const allStrategies = await prisma.strategy.findMany({
          where,
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
                originalForks: true,
              },
            },
          },
        });

        // Calculate average ratings and trending scores
        const strategiesWithMetadata = await Promise.all(
          allStrategies.map(async (strategy) => {
            const ratings = await prisma.rating.findMany({
              where: { strategyId: strategy.id },
              select: { rating: true },
            });

            const avgRating =
              ratings.length > 0
                ? ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
                  ratings.length
                : 0;

            const trendingScore = await calculateTrendingScore({
              id: strategy.id,
              viewCount: strategy.viewCount,
              likeCount: strategy.likeCount,
              forkCount: strategy.forkCount,
              createdAt: strategy.createdAt,
              updatedAt: strategy.updatedAt,
            });

            return {
              ...strategy,
              averageRating: avgRating,
              ratingCount: ratings.length,
              trendingScore,
            };
          })
        );

        // Sort based on sortBy
        const sortedStrategies = [...strategiesWithMetadata];
        switch (sortBy) {
          case 'newest':
            sortedStrategies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            break;
          case 'popular':
            sortedStrategies.sort((a, b) => b.viewCount - a.viewCount);
            break;
          case 'trending':
            sortedStrategies.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
            break;
          case 'rating':
            sortedStrategies.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
            break;
        }

        // Apply pagination
        const paginatedStrategies = sortedStrategies.slice(skip, skip + limit);
        const total = sortedStrategies.length;

        return {
          strategies: paginatedStrategies,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        logger.error(
          'Error discovering strategies',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
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
            },
          },
        },
      });

      return strategies;
    } catch (error) {
      logger.error(
        'Error fetching featured strategies',
        error instanceof Error ? error : new Error(String(error)),
        'Marketplace'
      );
      throw new Error('Failed to fetch featured strategies');
    }
  }),

  // Get trending strategies
  trending: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const strategies = await prisma.strategy.findMany({
          where: {
            isPublic: true,
          },
          take: 50, // Get more to calculate trending scores
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
                originalForks: true,
              },
            },
          },
        });

        // Calculate trending scores
        const strategiesWithScores = await Promise.all(
          strategies.map(async (strategy) => {
            const trendingScore = await calculateTrendingScore({
              id: strategy.id,
              viewCount: strategy.viewCount,
              likeCount: strategy.likeCount,
              forkCount: strategy.forkCount,
              createdAt: strategy.createdAt,
              updatedAt: strategy.updatedAt,
            });

            const ratings = await prisma.rating.findMany({
              where: { strategyId: strategy.id },
              select: { rating: true },
            });

            const avgRating =
              ratings.length > 0
                ? ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
                  ratings.length
                : 0;

            return {
              ...strategy,
              trendingScore,
              averageRating: avgRating,
              ratingCount: ratings.length,
            };
          })
        );

        // Sort by trending score and return top N
        strategiesWithScores.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
        return strategiesWithScores.slice(0, input.limit);
      } catch (error) {
        logger.error(
          'Error fetching trending strategies',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to fetch trending strategies');
      }
    }),

  // Get strategy details
  getStrategy: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
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
              originalForks: true,
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
          ? strategy.ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
            strategy.ratings.length
          : 0;

      return {
        ...strategy,
        averageRating: avgRating,
      };
    } catch (error) {
      logger.error(
        'Error fetching strategy',
        error instanceof Error ? error : new Error(String(error)),
        'Marketplace'
      );
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
        const userId = ctx.user.id;
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
        logger.error(
          'Error rating strategy',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
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
        const userId = ctx.user.id;

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
        logger.error(
          'Error adding review',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
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
        const userId = ctx.user.id;

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
        logger.error(
          'Error forking strategy',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
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
        const userId = ctx.user.id;

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
        logger.error(
          'Error updating strategy visibility',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to update strategy visibility');
      }
    }),

  // Get user profile with their strategies
  getUserProfile: publicProcedure
    .input(z.object({ userId: z.string().optional(), walletAddress: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        if (!input.userId && !input.walletAddress) {
          throw new Error('Either userId or walletAddress must be provided');
        }

        const where: any = {};
        if (input.userId) {
          where.id = input.userId;
        } else if (input.walletAddress) {
          where.walletAddress = input.walletAddress;
        }

        const user = await prisma.user.findUnique({
          where,
          include: {
            strategies: {
              where: {
                isPublic: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 20,
              include: {
                _count: {
                  select: {
                    ratings: true,
                    reviews: true,
                    originalForks: true,
                  },
                },
              },
            },
            _count: {
              select: {
                strategies: true,
                ratings: true,
                reviews: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Calculate user stats
        const publicStrategies = user.strategies.filter((s) => s.isPublic);
        const totalViews = publicStrategies.reduce((sum, s) => sum + s.viewCount, 0);
        const totalForks = publicStrategies.reduce((sum, s) => sum + s.forkCount, 0);

        return {
          ...user,
          stats: {
            totalStrategies: user._count.strategies,
            publicStrategies: publicStrategies.length,
            totalViews,
            totalForks,
            totalRatings: user._count.ratings,
            totalReviews: user._count.reviews,
          },
        };
      } catch (error) {
        logger.error(
          'Error fetching user profile',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to fetch user profile');
      }
    }),

  // Collections endpoints
  createCollection: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const collection = await prisma.collection.create({
          data: {
            userId,
            name: input.name,
            description: input.description,
            isPublic: input.isPublic,
          },
        });

        return collection;
      } catch (error) {
        logger.error(
          'Error creating collection',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to create collection');
      }
    }),

  addStrategyToCollection: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        strategyId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify collection ownership
        const collection = await prisma.collection.findFirst({
          where: {
            id: input.collectionId,
            userId,
          },
        });

        if (!collection) {
          throw new Error('Collection not found or unauthorized');
        }

        // Get current max order
        const maxOrder = await prisma.collectionStrategy.findFirst({
          where: { collectionId: input.collectionId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        const collectionStrategy = await prisma.collectionStrategy.create({
          data: {
            collectionId: input.collectionId,
            strategyId: input.strategyId,
            order: (maxOrder?.order || 0) + 1,
          },
          include: {
            strategy: true,
          },
        });

        return collectionStrategy;
      } catch (error) {
        logger.error(
          'Error adding strategy to collection',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to add strategy to collection');
      }
    }),

  getCollections: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = {};
        if (input.userId) {
          where.userId = input.userId;
        }
        if (input.isPublic !== undefined) {
          where.isPublic = input.isPublic;
        }

        const collections = await prisma.collection.findMany({
          where,
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
                strategies: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return collections;
      } catch (error) {
        logger.error(
          'Error fetching collections',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to fetch collections');
      }
    }),

  getCollection: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const collection = await prisma.collection.findUnique({
          where: { id: input.id },
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                username: true,
                avatarUrl: true,
              },
            },
            strategies: {
              include: {
                strategy: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        walletAddress: true,
                        username: true,
                      },
                    },
                    _count: {
                      select: {
                        ratings: true,
                        reviews: true,
                        originalForks: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        });

        if (!collection || (!collection.isPublic && collection.userId !== ctx?.user?.id)) {
          throw new Error('Collection not found or unauthorized');
        }

        return collection;
      } catch (error) {
        logger.error(
          'Error fetching collection',
          error instanceof Error ? error : new Error(String(error)),
          'Marketplace'
        );
        throw new Error('Failed to fetch collection');
      }
    }),
});
