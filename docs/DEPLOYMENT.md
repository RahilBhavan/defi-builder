# Deployment Guide

**Last Updated**: 2025-01-04  
**Status**: Production-Ready

## Overview

This guide covers deployment of the DeFi Builder application to staging and production environments.

## Prerequisites

- Bun runtime installed (or Node.js 20+)
- Access to deployment server/environment
- Environment variables configured
- Database access configured
- Domain/DNS configured (for production)
- SSL certificates (for production)

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

# API Keys
GEMINI_API_KEY=your-gemini-key
COINGECKO_API_KEY=your-coingecko-key

# CORS
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Sentry
SENTRY_DSN=your-sentry-dsn

# Environment
NODE_ENV=production
```

### Secrets Management

For production, use a secrets management service:

- **Doppler** (recommended) - See [Doppler Setup](../DOPPLER_SETUP.md)
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Environment variables** (less secure, not recommended for production)

## Build Process

### Frontend Build

```bash
# Install dependencies
bun install

# Build for production
bun run build

# Output will be in dist/ directory
```

### Backend Build

```bash
cd backend

# Install dependencies
bun install

# Generate Prisma client
bun run prisma:generate

# Run migrations
bun run prisma:migrate deploy

# Build TypeScript
bun run build
```

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel

1. **Connect Repository**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings:
     - Build Command: `bun run build`
     - Output Directory: `dist`
     - Install Command: `bun install`

2. **Environment Variables**
   - Add `VITE_API_URL` in Vercel dashboard
   - Add `VITE_SENTRY_DSN` if using Sentry

3. **Deploy**
   - Push to main branch triggers automatic deployment
   - Or deploy manually from Vercel dashboard

#### Backend on Railway

1. **Create Project**
   - Go to [Railway](https://railway.app)
   - Create new project
   - Connect GitHub repository
   - Select `backend/` directory

2. **Configure Environment**
   - Add all required environment variables
   - Set `NODE_ENV=production`
   - Configure database (Railway PostgreSQL addon)

3. **Deploy**
   - Railway auto-deploys on push to main
   - Check logs for deployment status

### Option 2: Docker Deployment

#### Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY backend/package.json backend/bun.lock ./
RUN bun install
COPY backend .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
RUN bunx prisma generate
EXPOSE 3001
CMD ["bun", "run", "dist/index.js"]
```

#### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:3001

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/defi_builder
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=defi_builder
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### Option 3: Manual Server Deployment

#### Frontend

1. **Build locally or on server**
   ```bash
   bun run build
   ```

2. **Copy to server**
   ```bash
   scp -r dist/* user@server:/var/www/defi-builder/
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       root /var/www/defi-builder;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

#### Backend

1. **Install dependencies**
   ```bash
   cd backend
   bun install
   bun run prisma:generate
   ```

2. **Run migrations**
   ```bash
   bun run prisma:migrate deploy
   ```

3. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name defi-builder-api
   pm2 save
   pm2 startup
   ```

## Database Setup

### Production Database

1. **Create Database**
   ```sql
   CREATE DATABASE defi_builder;
   CREATE USER defi_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE defi_builder TO defi_user;
   ```

2. **Run Migrations**
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." bun run prisma:migrate deploy
   ```

3. **Backup Strategy**
   - Set up automated backups
   - Test restore procedures
   - Monitor database size

## Monitoring

### Application Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Logging**: Structured logging with Winston
- **Health Checks**: `/health` endpoint

### Infrastructure Monitoring

- Server resources (CPU, memory, disk)
- Database performance
- Redis cache hit rates
- API response times

## Security Checklist

- [ ] HTTPS enabled (SSL certificates)
- [ ] Strong JWT secret configured
- [ ] API keys stored securely (not in code)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Database credentials secured
- [ ] Environment variables not exposed
- [ ] Security headers configured
- [ ] Regular dependency updates

## Post-Deployment

### Verification Steps

1. **Health Check**
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. **Frontend Loads**
   - Visit `https://yourdomain.com`
   - Verify all assets load
   - Check browser console for errors

3. **API Connectivity**
   - Test wallet connection
   - Verify API calls work
   - Check WebSocket connections

4. **Database**
   - Verify migrations applied
   - Check database connectivity
   - Test CRUD operations

### Rollback Plan

If issues occur:

1. **Frontend**: Revert to previous Vercel deployment
2. **Backend**: Use PM2 to restart previous version
3. **Database**: Restore from backup if needed

## Troubleshooting

### Common Issues

**Frontend not loading**
- Check build output
- Verify environment variables
- Check browser console for errors

**API errors**
- Check backend logs
- Verify database connection
- Check environment variables

**Database connection errors**
- Verify DATABASE_URL
- Check database is accessible
- Verify user permissions

## Performance Optimization

### Frontend

- Enable CDN for static assets
- Configure caching headers
- Use compression (gzip/brotli)
- Optimize images

### Backend

- Enable Redis caching
- Use connection pooling
- Optimize database queries
- Monitor response times

## Scaling

### Horizontal Scaling

- Use load balancer for multiple backend instances
- Stateless backend design supports scaling
- Database connection pooling
- Redis for shared state

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Add more Redis memory

## Support

For deployment issues:
- Check [Getting Started Guide](GETTING_STARTED.md)
- Review [Architecture Documentation](ARCHITECTURE.md)
- Open an issue on GitHub


