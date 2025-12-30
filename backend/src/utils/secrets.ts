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
    // Check if we're running under Doppler CLI (secrets already injected)
    // When using `doppler run`, Doppler injects secrets as environment variables
    // and sets DOPPLER_ENVIRONMENT to indicate it's active
    if (process.env.DOPPLER_ENVIRONMENT) {
      isDopplerInitialized = true;
      logger.info('Doppler CLI detected, secrets already available', 'Secrets');
      return;
    }

    // If service token provided, fetch secrets via Doppler REST API
    // Note: For production, prefer using Doppler CLI (doppler run) over service tokens
    if (dopplerToken && dopplerProject) {
      try {
        // Use Doppler REST API directly (no SDK dependency)
        const dopplerApiUrl = process.env.DOPPLER_API_URL || 'https://api.doppler.com/v3';
        const response = await fetch(
          `${dopplerApiUrl}/configs/config/secrets/download?project=${encodeURIComponent(dopplerProject)}&config=${encodeURIComponent(dopplerConfig)}&format=json`,
          {
            headers: {
              Authorization: `Bearer ${dopplerToken}`,
            },
          }
        );

        if (response.ok) {
          const data = (await response.json()) as { secrets?: Record<string, string> } | Record<string, string>;
          const secrets = 'secrets' in data && data.secrets ? data.secrets : (data as Record<string, string>);

          // Merge Doppler secrets into process.env (with existing env vars taking precedence)
          if (secrets && typeof secrets === 'object') {
            Object.entries(secrets).forEach(([key, value]) => {
              if (!process.env[key] && value) {
                process.env[key] = String(value);
              }
            });
          }

          isDopplerInitialized = true;
          logger.info('Doppler API initialized successfully', 'Secrets');
        } else {
          logger.warn('Failed to fetch secrets from Doppler API, using environment variables', 'Secrets');
        }
      } catch (apiError) {
        // API call failed - that's okay, we'll use env vars
        if (apiError instanceof Error) {
          logger.debug(`Doppler API error: ${apiError.message}`, 'Secrets');
        } else {
          logger.debug('Doppler API not available, using environment variables', 'Secrets');
        }
      }
    }
  } catch (error) {
    logger.warn('Doppler initialization skipped, using environment variables', 'Secrets');
    if (error instanceof Error) {
      logger.debug(`Doppler error: ${error.message}`, 'Secrets');
    } else {
      logger.debug(`Doppler error: ${String(error)}`, 'Secrets');
    }
  }
}

/**
 * Get secret value from Doppler or environment
 */
export async function getSecret(key: string, defaultValue?: string): Promise<string | undefined> {
  // If Doppler is initialized, secrets are already in process.env
  // (either via CLI injection or API fetch)
  if (isDopplerInitialized) {
    return process.env[key] || defaultValue;
  }

  // Fallback to environment variable
  return process.env[key] || defaultValue;
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(keys: string[]): Promise<Record<string, string | undefined>> {
  const secrets: Record<string, string | undefined> = {};

  // If Doppler is initialized, secrets are already in process.env
  keys.forEach((key) => {
    secrets[key] = process.env[key];
  });

  return secrets;
}

/**
 * Check if Doppler is available and initialized
 */
export function isDopplerAvailable(): boolean {
  return isDopplerInitialized;
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
    const dopplerToken = process.env.DOPPLER_TOKEN;
    const dopplerProject = process.env.DOPPLER_PROJECT;
    const dopplerConfig = process.env.DOPPLER_CONFIG || 'dev';

    if (!dopplerToken || !dopplerProject) {
      logger.warn('Cannot sync secrets: Doppler token or project not configured', 'Secrets');
      return;
    }

    // Fetch latest secrets from Doppler API
    const dopplerApiUrl = process.env.DOPPLER_API_URL || 'https://api.doppler.com/v3';
    const response = await fetch(
      `${dopplerApiUrl}/configs/config/secrets/download?project=${encodeURIComponent(dopplerProject)}&config=${encodeURIComponent(dopplerConfig)}&format=json`,
      {
        headers: {
          Authorization: `Bearer ${dopplerToken}`,
        },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { secrets?: Record<string, string> } | Record<string, string>;
      const secrets = 'secrets' in data && data.secrets ? data.secrets : (data as Record<string, string>);

      // Update process.env with latest secrets
      if (secrets && typeof secrets === 'object') {
        Object.entries(secrets).forEach(([key, value]) => {
          process.env[key] = String(value);
        });
      }

      logger.info('Secrets synced from Doppler', 'Secrets');
    } else {
      logger.warn('Failed to sync secrets from Doppler API', 'Secrets');
    }
  } catch (error) {
    logger.error('Failed to sync secrets from Doppler', error instanceof Error ? error : new Error(String(error)), 'Secrets');
  }
}

