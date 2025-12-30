/**
 * Secret Rotation Job
 * Periodically syncs secrets from Doppler to ensure API keys are up-to-date
 * 
 * This job runs on a schedule to:
 * - Sync secrets from Doppler (in case webhook fails)
 * - Rotate API keys proactively
 * - Ensure secrets are always fresh
 */

import { syncSecrets } from '../utils/secrets';
import { auditApiKey, AuditEventType } from '../utils/auditLogger';
import { logger } from '../utils/logger';

const ROTATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let rotationInterval: NodeJS.Timeout | null = null;

/**
 * Start the secret rotation job
 * Syncs secrets from Doppler periodically
 */
export function startSecretRotationJob(): void {
  if (rotationInterval) {
    logger.warn('Secret rotation job already running', 'SecretRotation');
    return;
  }

  logger.info('Starting secret rotation job', 'SecretRotation', {
    interval: `${ROTATION_INTERVAL_MS / 1000 / 60} minutes`,
  });

  // Initial sync
  performSecretRotation().catch((error) => {
    logger.error('Initial secret rotation failed', error instanceof Error ? error : new Error(String(error)), 'SecretRotation');
  });

  // Schedule periodic rotation
  rotationInterval = setInterval(() => {
    performSecretRotation().catch((error) => {
      logger.error('Scheduled secret rotation failed', error instanceof Error ? error : new Error(String(error)), 'SecretRotation');
    });
  }, ROTATION_INTERVAL_MS);
}

/**
 * Stop the secret rotation job
 */
export function stopSecretRotationJob(): void {
  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
    logger.info('Secret rotation job stopped', 'SecretRotation');
  }
}

/**
 * Perform secret rotation
 * Syncs secrets from Doppler
 */
async function performSecretRotation(): Promise<void> {
  try {
    logger.debug('Performing secret rotation', 'SecretRotation');
    
    await syncSecrets();

    auditApiKey(AuditEventType.SECRET_SYNCED, {
      keyName: 'all',
      success: true,
      metadata: {
        triggeredBy: 'scheduled_job',
      },
    });

    logger.info('Secret rotation completed successfully', 'SecretRotation');
  } catch (error) {
    logger.error('Secret rotation failed', error instanceof Error ? error : new Error(String(error)), 'SecretRotation');
    
    auditApiKey(AuditEventType.SECRET_SYNCED, {
      keyName: 'all',
      success: false,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        triggeredBy: 'scheduled_job',
      },
    });

    throw error;
  }
}

