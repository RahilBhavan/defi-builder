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

  // Use a function that Vite won't statically analyze
  const loadSentry = async () => {
    try {
      // Dynamic import to avoid bundling Sentry in production if not needed
      // Note: @sentry/react is optional - gracefully handle if not installed
      const sentryModule = await import(/* @vite-ignore */ '@sentry/react');
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
    } catch (error) {
      // Sentry is optional - fail silently if not installed
      const err = error instanceof Error ? error : new Error(String(error));
      if (!err.message.includes('Cannot find module') && !err.message.includes('Failed to fetch')) {
        logger.warn('Failed to initialize Sentry', 'Monitoring');
      }
    }
  };

  loadSentry().catch(() => {
    // Ignore - Sentry is optional
  });
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
  // Log based on level
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
 * Track custom event (for analytics)
 * Can be extended to support PostHog, Mixpanel, etc.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  // Log event for now (can be extended to PostHog, Mixpanel, etc.)
  logger.info(`Event: ${eventName}`, 'Analytics', properties);

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
    logger.info(`Performance: ${name} took ${duration.toFixed(2)}ms`, 'Performance');
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

