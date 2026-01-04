/**
 * Webhook endpoints for external services
 * Handles webhooks from Doppler, GitHub, etc.
 */

import { z } from 'zod';
import { AuditEventType, auditApiKey } from '../../utils/auditLogger';
import { logger } from '../../utils/logger';
import { syncSecrets } from '../../utils/secrets';
import { publicProcedure, router } from '../index';

/**
 * Doppler webhook for secret rotation
 * Called by Doppler when secrets are updated
 */
export const webhooksRouter = router({
  doppler: publicProcedure
    .input(
      z.object({
        event: z.enum(['secret.rotated', 'secret.updated', 'config.changed']),
        project: z.string(),
        config: z.string(),
        secret: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        logger.info('Doppler webhook received', 'Webhooks', {
          event: input.event,
          project: input.project,
          config: input.config,
        });

        // Sync secrets from Doppler
        await syncSecrets();

        // Audit log the rotation
        auditApiKey(AuditEventType.SECRET_SYNCED, {
          keyName: input.secret || 'all',
          success: true,
          metadata: {
            event: input.event,
            project: input.project,
            config: input.config,
          },
        });

        return { success: true, message: 'Secrets synced successfully' };
      } catch (error) {
        logger.error(
          'Failed to sync secrets from Doppler webhook',
          error instanceof Error ? error : new Error(String(error)),
          'Webhooks'
        );

        auditApiKey(AuditEventType.SECRET_SYNCED, {
          keyName: input.secret || 'all',
          success: false,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        throw new Error('Failed to sync secrets');
      }
    }),
});
