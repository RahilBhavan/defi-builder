# Monitoring and Analytics Guide

This guide covers setting up monitoring, error tracking, and analytics for the DeFi Builder application.

## Error Tracking with Sentry

### Frontend Setup

1. **Install Sentry** (optional - only if you want error tracking)
   ```bash
   npm install @sentry/react
   ```

2. **Initialize Sentry in App.tsx**
   ```typescript
   import { initSentry } from './utils/monitoring';
   
   // Initialize Sentry
   initSentry(import.meta.env.VITE_SENTRY_DSN);
   ```

3. **Add DSN to environment variables**
   ```env
   VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

### Backend Setup

1. **Install Sentry**
   ```bash
   cd backend
   npm install @sentry/node
   ```

2. **Initialize in backend/src/index.ts**
   ```typescript
   import { initSentry, performanceMiddleware } from './utils/monitoring';
   
   // Initialize Sentry
   initSentry(process.env.SENTRY_DSN);
   
   // Add performance middleware
   app.use(performanceMiddleware);
   ```

3. **Add DSN to backend environment**
   ```env
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

### Using Monitoring Utilities

```typescript
import { captureException, trackEvent, measurePerformance } from './utils/monitoring';

// Capture exceptions
try {
  // risky code
} catch (error) {
  captureException(error, { context: 'user-action' });
}

// Track events
trackEvent('strategy_executed', {
  strategyId: 'abc123',
  blockCount: 5,
});

// Measure performance
const result = await measurePerformance('backtest', async () => {
  return await runBacktest(strategy);
});
```

## Analytics with PostHog

### Setup

1. **Install PostHog**
   ```bash
   npm install posthog-js
   ```

2. **Initialize in App.tsx**
   ```typescript
   import posthog from 'posthog-js';
   
   if (import.meta.env.VITE_POSTHOG_KEY) {
     posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
       api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
     });
   }
   ```

3. **Track events**
   ```typescript
   import posthog from 'posthog-js';
   
   posthog.capture('strategy_created', {
     blockCount: 5,
     hasOptimization: true,
   });
   ```

## Uptime Monitoring

### Recommended Services

1. **UptimeRobot** (Free tier available)
   - Monitor: `https://api.your-domain.com/health`
   - Alert on downtime
   - Set up 5-minute checks

2. **Pingdom**
   - More advanced monitoring
   - Transaction monitoring
   - Real user monitoring

### Health Check Endpoint

The backend includes a health check endpoint:

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

## Performance Monitoring

### Frontend Performance

1. **Web Vitals**
   - Use Lighthouse CI in GitHub Actions
   - Monitor Core Web Vitals (LCP, FID, CLS)

2. **Bundle Analysis**
   - Run `npm run build:analyze` to generate bundle stats
   - Review `dist/stats.html` for bundle breakdown

### Backend Performance

1. **Request Timing**
   - Performance middleware logs slow requests (>1s)
   - Sentry tracks performance automatically

2. **Database Query Monitoring**
   - Monitor slow queries
   - Use Prisma query logging in development

## Logging

### Structured Logging

The application uses structured logging via `utils/logger.ts`:

```typescript
import { logger } from './utils/logger';

logger.info('User logged in', undefined, 'Auth', { userId: '123' });
logger.error('Failed to save strategy', error, 'StrategyStorage');
logger.warn('Rate limit approaching', undefined, 'RateLimiter');
```

### Log Levels

- `error`: Errors that need attention
- `warn`: Warnings that should be reviewed
- `info`: Informational messages
- `debug`: Debug information (development only)

## Metrics to Monitor

### Application Metrics

- **Error Rate**: Track errors per endpoint
- **Response Time**: P50, P95, P99 latencies
- **Request Rate**: Requests per second
- **Active Users**: Concurrent users

### Business Metrics

- **Strategies Created**: Track strategy creation events
- **Backtests Run**: Monitor backtest usage
- **Optimizations Started**: Track optimization runs
- **API Usage**: Monitor API endpoint usage

### Infrastructure Metrics

- **CPU Usage**: Server CPU utilization
- **Memory Usage**: Memory consumption
- **Database Connections**: Active connections
- **Cache Hit Rate**: Redis cache performance

## Alerting

### Recommended Alerts

1. **Error Rate > 1%**: High error rate
2. **Response Time > 2s**: Slow responses
3. **Uptime < 99.9%**: Service availability
4. **Database Connection Failures**: Database issues
5. **Memory Usage > 80%**: High memory usage

### Setting Up Alerts

1. **Sentry Alerts**
   - Go to Sentry dashboard
   - Create alert rules
   - Configure notification channels (email, Slack, etc.)

2. **UptimeRobot Alerts**
   - Configure alert contacts
   - Set up email/SMS notifications

## Dashboard

### Recommended Dashboards

1. **Sentry Dashboard**
   - Error trends
   - Performance metrics
   - Release tracking

2. **PostHog Dashboard**
   - User analytics
   - Feature usage
   - Funnel analysis

3. **Custom Dashboard** (Grafana)
   - Infrastructure metrics
   - Application performance
   - Business metrics

## Best Practices

1. **Don't Log Sensitive Data**
   - Never log API keys, passwords, or tokens
   - Sanitize user input in logs

2. **Use Appropriate Log Levels**
   - Error: Only for actual errors
   - Warn: For potential issues
   - Info: For important events
   - Debug: For development debugging

3. **Include Context**
   - Always include relevant context in error reports
   - Use structured logging with metadata

4. **Monitor Regularly**
   - Review error reports daily
   - Check performance metrics weekly
   - Review analytics monthly

## Troubleshooting

### Sentry Not Capturing Errors

1. Check DSN is correct
2. Verify Sentry is initialized before errors occur
3. Check browser console for Sentry errors
4. Verify network requests to Sentry are not blocked

### Performance Issues

1. Check bundle size (`npm run build:analyze`)
2. Review slow query logs
3. Monitor memory usage
4. Check for memory leaks

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [PostHog Documentation](https://posthog.com/docs)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

