/**
 * Alert System tRPC Router
 * Handles alert creation, management, and triggering
 */

import { z } from 'zod';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { protectedProcedure, router } from '../index';

const AlertConditionSchema = z.object({
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']),
  value: z.union([z.number(), z.string()]),
  field: z.string(),
  token: z.string().optional(),
});

const AlertTypeSchema = z.enum(['price', 'position', 'strategy', 'time']);

export const alertsRouter = router({
  // Create a new alert
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: AlertTypeSchema,
        condition: AlertConditionSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const alert = await prisma.alert.create({
          data: {
            userId,
            name: input.name,
            type: input.type,
            condition: JSON.stringify(input.condition),
            isActive: true,
          },
        });

        return alert;
      } catch (error) {
        logger.error(
          'Error creating alert',
          error instanceof Error ? error : new Error(String(error)),
          'Alerts'
        );
        throw new Error('Failed to create alert');
      }
    }),

  // Get user's alerts
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      if (!userId) {
        throw new Error('Unauthorized');
      }

      const alerts = await prisma.alert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return alerts.map((alert) => ({
        ...alert,
        condition: JSON.parse(alert.condition),
      }));
    } catch (error) {
      logger.error(
        'Error fetching alerts',
        error instanceof Error ? error : new Error(String(error)),
        'Alerts'
      );
      throw new Error('Failed to fetch alerts');
    }
  }),

  // Update alert
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        condition: AlertConditionSchema.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.alert.findFirst({
          where: { id: input.id, userId },
        });

        if (!existing) {
          throw new Error('Alert not found or unauthorized');
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.condition !== undefined) updateData.condition = JSON.stringify(input.condition);
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        const alert = await prisma.alert.update({
          where: { id: input.id },
          data: updateData,
        });

        return {
          ...alert,
          condition: JSON.parse(alert.condition),
        };
      } catch (error) {
        logger.error(
          'Error updating alert',
          error instanceof Error ? error : new Error(String(error)),
          'Alerts'
        );
        throw new Error('Failed to update alert');
      }
    }),

  // Delete alert
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.alert.findFirst({
          where: { id: input.id, userId },
        });

        if (!existing) {
          throw new Error('Alert not found or unauthorized');
        }

        await prisma.alert.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        logger.error(
          'Error deleting alert',
          error instanceof Error ? error : new Error(String(error)),
          'Alerts'
        );
        throw new Error('Failed to delete alert');
      }
    }),

  // Trigger alert (for testing)
  trigger: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const alert = await prisma.alert.findFirst({
          where: { id: input.id, userId },
        });

        if (!alert) {
          throw new Error('Alert not found or unauthorized');
        }

        const updated = await prisma.alert.update({
          where: { id: input.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            triggeredAt: new Date(),
          },
        });

        return {
          ...updated,
          condition: JSON.parse(updated.condition),
        };
      } catch (error) {
        logger.error(
          'Error triggering alert',
          error instanceof Error ? error : new Error(String(error)),
          'Alerts'
        );
        throw new Error('Failed to trigger alert');
      }
    }),
});
