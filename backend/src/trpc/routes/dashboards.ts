/**
 * Dashboards tRPC Router
 * Handles dashboard CRUD operations
 */

import { z } from 'zod';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { protectedProcedure, router } from '../index';

export const dashboardsRouter = router({
  // Create a new dashboard
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        layout: z.any().optional(),
        widgets: z.array(z.any()).optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // If this is set as default, unset other defaults
        if (input.isDefault) {
          await prisma.dashboard.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const dashboard = await prisma.dashboard.create({
          data: {
            userId,
            name: input.name,
            layout: JSON.stringify(input.layout || {}),
            widgets: JSON.stringify(input.widgets || []),
            isDefault: input.isDefault,
          },
        });

        return {
          ...dashboard,
          layout: JSON.parse(dashboard.layout),
          widgets: JSON.parse(dashboard.widgets),
        };
      } catch (error) {
        logger.error(
          'Error creating dashboard',
          error instanceof Error ? error : new Error(String(error)),
          'Dashboards'
        );
        throw new Error('Failed to create dashboard');
      }
    }),

  // Get user's dashboards
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      if (!userId) {
        throw new Error('Unauthorized');
      }

      const dashboards = await prisma.dashboard.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return dashboards.map((dashboard) => ({
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
        widgets: JSON.parse(dashboard.widgets),
      }));
    } catch (error) {
      logger.error(
        'Error fetching dashboards',
        error instanceof Error ? error : new Error(String(error)),
        'Dashboards'
      );
      throw new Error('Failed to fetch dashboards');
    }
  }),

  // Get dashboard by ID
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      if (!userId) {
        throw new Error('Unauthorized');
      }

      const dashboard = await prisma.dashboard.findFirst({
        where: { id: input.id, userId },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found or unauthorized');
      }

      return {
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
        widgets: JSON.parse(dashboard.widgets),
      };
    } catch (error) {
      logger.error(
        'Error fetching dashboard',
        error instanceof Error ? error : new Error(String(error)),
        'Dashboards'
      );
      throw new Error('Failed to fetch dashboard');
    }
  }),

  // Update dashboard
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        layout: z.any().optional(),
        widgets: z.array(z.any()).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.dashboard.findFirst({
          where: { id: input.id, userId },
        });

        if (!existing) {
          throw new Error('Dashboard not found or unauthorized');
        }

        // If setting as default, unset other defaults
        if (input.isDefault) {
          await prisma.dashboard.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.layout !== undefined) updateData.layout = JSON.stringify(input.layout);
        if (input.widgets !== undefined) updateData.widgets = JSON.stringify(input.widgets);
        if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

        const dashboard = await prisma.dashboard.update({
          where: { id: input.id },
          data: updateData,
        });

        return {
          ...dashboard,
          layout: JSON.parse(dashboard.layout),
          widgets: JSON.parse(dashboard.widgets),
        };
      } catch (error) {
        logger.error(
          'Error updating dashboard',
          error instanceof Error ? error : new Error(String(error)),
          'Dashboards'
        );
        throw new Error('Failed to update dashboard');
      }
    }),

  // Delete dashboard
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.dashboard.findFirst({
          where: { id: input.id, userId },
        });

        if (!existing) {
          throw new Error('Dashboard not found or unauthorized');
        }

        await prisma.dashboard.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        logger.error(
          'Error deleting dashboard',
          error instanceof Error ? error : new Error(String(error)),
          'Dashboards'
        );
        throw new Error('Failed to delete dashboard');
      }
    }),
});
