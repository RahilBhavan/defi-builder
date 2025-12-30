/**
 * Secrets Management with Doppler
 * Provides secure access to secrets with fallback to environment variables
 * 
 * Doppler is a modern secrets management platform that:
 * - Encrypts secrets at rest and in transit
 * - Provides audit logging
 * - Supports secret rotation
 * - Integrates with CI/CD
 * 
 * Usage:
 * - Development: Uses Doppler CLI (doppler run)
 * - Production: Uses Doppler service tokens
 * - Fallback: Environment variables (for local dev without Doppler)
 */

import { logger } from './logger';

let dopplerClient: any = null;
let isDopplerInitialized = false;

/**
 * Initialize Doppler client
 * Falls back to environment variables if Doppler is not available
 */
export async function initDoppler(): Promise<void> {
  // Check if Doppler is available
  const dopplerToken = process.env.DOPPLER_TOKEN;
  const dopplerProject = process.env.DOPPLER_PROJECT;
  const dopplerConfig = process.env.DOPPLER_CONFIG || 'dev';

  // If no Doppler token, use environment variables (fallback)
  if (!dopplerToken) {
    logger.info('Doppler not configured, using environment variables', 'Secrets');
    return;
  }

  try {
    // Dynamic import to avoid requiring Doppler SDK as dependency if not used
    // Note: For CLI usage (doppler run), secrets are already in process.env
    // This is for programmatic access via service tokens
    
    // Check if we're running under Doppler CLI (secrets already injected)
    if (process.env.DOPPLER_ENVIRONMENT) {
      isDopplerInitialized = true;
      logger.info('Doppler CLI detected, secrets already available', 'Secrets');
      return;
    }

    // If service token provided, use Doppler SDK
    if (dopplerToken && dopplerProject) {
      try {
        const { Doppler } = await import('@dopplerhq/node');
        
        dopplerClient = new Doppler({
          token: dopplerToken,
        });

        // Fetch secrets from Doppler
        const response = await dopplerClient.getSecrets({
          project: dopplerProject,
          config: dopplerConfig,
        });

        // Merge Doppler secrets into process.env (with existing env vars taking precedence)
        if (response && typeof response === 'object') {
          const secrets = response.secrets || response;
          Object.entries(secrets).forEach(([key, value]) => {
            if (!process.env[key] && value) {
              process.env[key] = String(value);
            }
          });
        }

        isDopplerInitialized = true;
        logger.info('Doppler SDK initialized successfully', 'Secrets', {
          project: dopplerProject,
          config: dopplerConfig,
        });
      } catch (sdkError) {
        // SDK not installed or error - that's okay, we'll use env vars
        logger.debug('Doppler SDK not available, using environment variables', 'Secrets');
      }
    }
  } catch (error) {
    logger.warn('Doppler initialization skipped, using environment variables', 'Secrets');
    logger.debug('Doppler error', error instanceof Error ? error : new Error(String(error)), 'Secrets');
  }
}

/**
 * Get secret value from Doppler or environment
 */
export async function getSecret(key: string, defaultValue?: string): Promise<string | undefined> {
  if (isDopplerInitialized && dopplerClient) {
    try {
      const value = await dopplerClient.getSecret(key);
      return value || defaultValue;
    } catch (error) {
      logger.warn(`Failed to get secret "${key}" from Doppler, using environment variable`, 'Secrets');
    }
  }

  // Fallback to environment variable
  return process.env[key] || defaultValue;
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(keys: string[]): Promise<Record<string, string | undefined>> {
  const secrets: Record<string, string | undefined> = {};

  if (isDopplerInitialized && dopplerClient) {
    try {
      const dopplerSecrets = await dopplerClient.getSecrets();
      keys.forEach((key) => {
        secrets[key] = dopplerSecrets[key] || process.env[key];
      });
    } catch (error) {
      logger.warn('Failed to get secrets from Doppler, using environment variables', 'Secrets');
      keys.forEach((key) => {
        secrets[key] = process.env[key];
      });
    }
  } else {
    // Fallback to environment variables
    keys.forEach((key) => {
      secrets[key] = process.env[key];
    });
  }

  return secrets;
}

/**
 * Check if Doppler is available and initialized
 */
export function isDopplerAvailable(): boolean {
  return isDopplerInitialized && dopplerClient !== null;
}

/**
 * Sync secrets from Doppler (useful for secret rotation)
 */
export async function syncSecrets(): Promise<void> {
  if (!isDopplerInitialized) {
    await initDoppler();
    return;
  }

  try {
    const dopplerProject = process.env.DOPPLER_PROJECT;
    const dopplerConfig = process.env.DOPPLER_CONFIG || 'dev';

    const secrets = await dopplerClient.getSecrets({
      project: dopplerProject,
      config: dopplerConfig,
    });

    // Update process.env with latest secrets
    if (secrets && typeof secrets === 'object') {
      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = String(value);
      });
    }

    logger.info('Secrets synced from Doppler', 'Secrets');
  } catch (error) {
    logger.error('Failed to sync secrets from Doppler', error instanceof Error ? error : new Error(String(error)), 'Secrets');
  }
}

