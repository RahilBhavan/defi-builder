/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

import { logger } from './logger';

interface EnvConfig {
  required: string[];
  optional: string[];
}

const ENV_CONFIG: EnvConfig = {
  required: [
    'DATABASE_URL',
    // 'REDIS_URL', // Optional if not using Redis
  ],
  optional: [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'PORT',
    'FRONTEND_URL',
    'JWT_SECRET',
    'NODE_ENV',
    'REDIS_URL',
  ],
};

/**
 * Validate environment variables
 * Throws error if required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of ENV_CONFIG.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    warnings.push('GEMINI_API_KEY or OPENAI_API_KEY (AI features will be limited)');
  }

  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET (using default - not secure for production)');
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment variable warnings:', 'EnvValidation', { warnings });
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('Environment validation failed', error, 'EnvValidation');
    throw error;
  }

  logger.info('Environment variables validated successfully', 'EnvValidation');
}

/**
 * Get environment variable with default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue || '';
}

/**
 * Get boolean environment variable
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  if (!value) return defaultValue!;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return num;
}

