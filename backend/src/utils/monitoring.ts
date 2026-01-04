/**
 * Backend Monitoring Utilities
 * Provides error tracking and performance monitoring for backend
 */

import { logger } from './logger';

// Sentry integration (optional)
// biome-ignore lint/suspicious/noExplicitAny: Sentry is dynamically imported, type is unknown at compile time
let Sentry: any = null;
let isSentryInitialized = false;

/**
 * Initialize Sentry for error tracking
 */
export function initSentry(dsn?: string): void {
  if (!dsn) {
    logger.warn('Sentry DSN not provided, error tracking disabled', 'Monitoring');
    return;
  }

  try {
    // Dynamic import to avoid requiring Sentry as dependency
    // Using require with try-catch to handle missing package gracefully
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [new Sentry.Integrations.Http({ tracing: true })],
    });
    isSentryInitialized = true;
    logger.info('Sentry initialized successfully', 'Monitoring');
  } catch (_error) {
    // Sentry is optional - fail silently if not installed
    logger.debug('Sentry not available (optional dependency)', 'Monitoring');
  }
}

/**
 * Capture exception to Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (isSentryInitialized && Sentry) {
    Sentry.captureException(error, {
      contexts: {
        custom: context || {},
      },
    });
  }
  // Always log to logger as fallback
  logger.error('Exception captured', error, 'Monitoring', context);
}

/**
 * Capture message to Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (isSentryInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context || {},
      },
    });
  }
  // Use appropriate logger method
  if (level === 'error') {
    logger.error(message, undefined, 'Monitoring', context);
  } else if (level === 'warning') {
    logger.warn(message, 'Monitoring', context);
  } else {
    logger.info(message, 'Monitoring', context);
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string, walletAddress?: string): void {
  if (isSentryInitialized && Sentry) {
    Sentry.setUser({
      id: userId,
      email,
      walletAddress,
    });
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (isSentryInitialized && Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Performance monitoring middleware
 */
// biome-ignore lint/suspicious/noExplicitAny: Express Request/Response types are complex, using any for middleware compatibility
export function performanceMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body: unknown) {
    const duration = Date.now() - startTime;
    logger.info(`API: ${req.method} ${req.path} - ${duration}ms`, 'Performance', {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
    });

    // Track slow requests
    if (duration > 1000) {
      captureMessage(`Slow request: ${req.method} ${req.path} took ${duration}ms`, 'warning', {
        method: req.method,
        path: req.path,
        duration,
      });
    }

    return originalSend.call(this, body);
  };

  next();
}
