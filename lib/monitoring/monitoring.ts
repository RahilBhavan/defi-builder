/**
 * Monitoring and Analytics Utilities
 * Provides error tracking, analytics, and performance monitoring
 */

import { logger } from './logger';

// Sentry integration (optional)
let Sentry: any = null;
let isSentryInitialized = false;

/**
 * Initialize Sentry for error tracking
 * Call this in your app initialization
 */
export function initSentry(dsn?: string): void {
  if (!dsn) {
    logger.warn('Sentry DSN not provided, error tracking disabled', 'Monitoring');
    return;
  }

  try {
    // Dynamic import to avoid bundling Sentry in production if not needed
    import('@sentry/react').then((sentryModule) => {
      Sentry = sentryModule;
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE || 'development',
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay(),
        ],
      });
      isSentryInitialized = true;
      logger.info('Sentry initialized successfully', 'Monitoring');
    }).catch((error) => {
      logger.error('Failed to initialize Sentry', error instanceof Error ? error : new Error(String(error)), 'Monitoring');
    });
  } catch (error) {
    logger.error('Error loading Sentry', error instanceof Error ? error : new Error(String(error)), 'Monitoring');
  }
}

/**
 * Capture exception to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (isSentryInitialized && Sentry) {
    Sentry.captureException(error, {
      contexts: {
        custom: context || {},
      },
    });
  }
  // Always log to console/logger as fallback
  logger.error('Exception captured', error, 'Monitoring', context);
}

/**
 * Capture message to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
  if (isSentryInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context || {},
      },
    });
  }
  logger[level](message, undefined, 'Monitoring', context);
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
 * Track custom event (for analytics)
 * Can be extended to support PostHog, Mixpanel, etc.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  // Log event for now (can be extended to PostHog, Mixpanel, etc.)
  logger.info(`Event: ${eventName}`, undefined, 'Analytics', properties);

  // Example: PostHog integration
  // if (window.posthog) {
  //   window.posthog.capture(eventName, properties);
  // }
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, any>): void {
  trackEvent('page_view', {
    page: pageName,
    ...properties,
  });
}

/**
 * Performance monitoring
 */
export function startPerformanceMeasurement(name: string): () => void {
  const startTime = performance.now();
  return () => {
    const duration = performance.now() - startTime;
    logger.info(`Performance: ${name} took ${duration.toFixed(2)}ms`, undefined, 'Performance');
    trackEvent('performance_measurement', {
      name,
      duration,
    });
  };
}

/**
 * Measure async function performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const endMeasurement = startPerformanceMeasurement(name);
  try {
    const result = await fn();
    endMeasurement();
    return result;
  } catch (error) {
    endMeasurement();
    throw error;
  }
}

