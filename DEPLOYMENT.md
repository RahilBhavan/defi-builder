# Deployment Guide

**Last Updated:** 2025-01-03  
**Status:** Production-Ready

---

## Overview

This guide covers deployment of the DeFi Builder application to staging and production environments.

---

## Prerequisites

- Bun runtime installed
- Access to deployment server/environment
- Environment variables configured
- Database access configured
- Domain/DNS configured (for production)

---

## Environment Setup

### Required Environment Variables

#### Frontend (.env)
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_SENTRY_DSN=your-sentry-dsn
```

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/defi_builder

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# API Keys (from Doppler or similar)
GEMINI_API_KEY=your-gemini-key
COINGECKO_API_KEY=your-coingecko-key

# CORS
CORS_ORIGIN=https://yourdomain.com

# Sentry
SENTRY_DSN=your-sentry-dsn
```

---

## Deployment Steps

### 1. Staging Deployment

#### Manual Deployment
```bash
# Build frontend
bun install
bun run build

# Build backend
cd backend
bun install
bun run build

# Deploy (example with rsync)
rsync -avz dist/ user@staging-server:/var/www/defi-builder-frontend/
rsync -avz backend/dist/ user@staging-server:/var/www/defi-builder-backend/
```

#### Automated Deployment (GitHub Actions)
1. Push to `main` branch
2. GitHub Actions will:
   - Run tests
   - Build frontend and backend
   - Deploy to staging environment
   - Run smoke tests

### 2. Production Deployment

#### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Backup database
- [ ] Monitor staging for issues

#### Manual Deployment
   ```bash
# Build for production
NODE_ENV=production bun run build
cd backend && NODE_ENV=production bun run build

# Deploy to production
# (Use your preferred deployment method)
   ```

#### Automated Deployment (GitHub Actions)
1. Go to Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Monitor deployment progress
5. Verify deployment with smoke tests

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)
- Runs on every PR and push
- Lint and type check
- Run tests
- Build application
- Upload artifacts

#### 2. Deploy Workflow (`.github/workflows/deploy.yml`)
- Runs on push to `main` (staging)
- Manual trigger for production
- Builds frontend and backend
- Deploys to staging/production
- Runs smoke tests

---

## Deployment Environments

### Staging
- **URL:** `https://staging.yourdomain.com`
- **Purpose:** Pre-production testing
- **Auto-deploy:** Yes (on push to main)
- **Database:** Staging database

### Production
- **URL:** `https://yourdomain.com`
- **Purpose:** Live application
- **Auto-deploy:** No (manual trigger)
- **Database:** Production database

---

## Smoke Tests

After deployment, run smoke tests:

   ```bash
# Frontend health check
curl -f https://yourdomain.com

# Backend health check
curl -f https://api.yourdomain.com/health

# API endpoint check
curl -f https://api.yourdomain.com/trpc/health.check
```

---

## Monitoring

### Post-Deployment Monitoring

1. **Application Health**
   - Check Sentry for errors
   - Monitor API response times
   - Check database connections

2. **User Impact**
   - Monitor error rates
   - Check user sessions
   - Verify critical features

3. **Performance**
   - Check bundle sizes
   - Monitor API latency
   - Verify caching

---

## Rollback Procedure

If deployment fails:

1. **Immediate Rollback**
```bash
   # Restore previous build
   # (Method depends on your deployment setup)
   ```

2. **Database Rollback**
   ```bash
   # Restore database backup
   # Run previous migrations if needed
   ```

3. **Verify Rollback**
   - Check application is working
   - Verify database state
   - Monitor for issues

---

## Troubleshooting

### Common Issues

#### Build Fails
- Check environment variables
- Verify dependencies
- Check build logs

#### Deployment Fails
- Check server access
- Verify file permissions
- Check disk space

#### Application Errors
- Check Sentry for errors
- Verify environment variables
- Check database connection
- Review application logs

---

## Security Considerations

1. **Environment Variables**
   - Never commit secrets
   - Use Doppler or similar service
   - Rotate keys regularly

2. **Database**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups

3. **API Keys**
   - Store server-side only
   - Rotate regularly
   - Monitor usage

---

## Best Practices

1. **Always test in staging first**
2. **Deploy during low-traffic periods**
3. **Monitor closely after deployment**
4. **Keep deployment logs**
5. **Document any issues**
6. **Have rollback plan ready**

---

## Support

For deployment issues:
1. Check deployment logs
2. Review GitHub Actions logs
3. Check Sentry for errors
4. Contact DevOps team

---

**Last Updated:** 2025-01-03
