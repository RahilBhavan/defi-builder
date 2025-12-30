# Deployment Guide

This guide covers deploying the DeFi Builder application to production.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or SQLite for development)
- Redis 6+ (optional, for caching)
- Domain name and SSL certificate
- Environment variables configured

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Frontend  │ ───> │   Backend   │ ───> │  PostgreSQL │
│  (Vite/React)│      │  (Express)  │      │   Database  │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │    Redis     │
                     │   (Cache)    │
                     └─────────────┘
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add:
     - `VITE_API_URL` - Your backend API URL

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

### Option 2: Netlify

1. **Deploy via Netlify Dashboard**
   - Connect your GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Environment Variables**
   - Add `VITE_API_URL` in Netlify dashboard

### Option 3: Self-Hosted (Nginx)

1. **Build the application**
   ```bash
   npm ci
   npm run build
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/defi-builder/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **Set up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Connect Repository**
   - Go to Railway dashboard
   - New Project > Deploy from GitHub
   - Select your repository

2. **Configure Services**
   - Add PostgreSQL service
   - Add Redis service (optional)
   - Configure environment variables

3. **Environment Variables**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   REDIS_URL=redis://host:6379
   JWT_SECRET=your-secret-key-min-32-chars
   GEMINI_API_KEY=your-gemini-api-key
   FRONTEND_URL=https://your-frontend-domain.com
   PORT=3001
   NODE_ENV=production
   ```

### Option 2: Render

1. **Create Web Service**
   - New > Web Service
   - Connect GitHub repository
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Add PostgreSQL Database**
   - New > PostgreSQL
   - Copy connection string to `DATABASE_URL`

3. **Environment Variables**
   - Add all required variables in Render dashboard

### Option 3: Self-Hosted (Docker)

1. **Create Dockerfile**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY backend/package*.json ./
   RUN npm ci --production
   COPY backend/ .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "3001:3001"
       environment:
         - DATABASE_URL=${DATABASE_URL}
         - REDIS_URL=${REDIS_URL}
         - JWT_SECRET=${JWT_SECRET}
         - GEMINI_API_KEY=${GEMINI_API_KEY}
         - FRONTEND_URL=${FRONTEND_URL}
       depends_on:
         - postgres
         - redis
     
     postgres:
       image: postgres:14-alpine
       environment:
         - POSTGRES_DB=defi_builder
         - POSTGRES_USER=defi_user
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     redis:
       image: redis:6-alpine
       volumes:
         - redis_data:/data
   
   volumes:
     postgres_data:
     redis_data:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

## Environment Variables

### Frontend (.env.production)
```env
VITE_API_URL=https://api.your-domain.com
```

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (optional)
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-secret-key-minimum-32-characters-long
NODE_ENV=production

# API Keys
GEMINI_API_KEY=your-gemini-api-key

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# Server
PORT=3001
```

## Database Setup

1. **Create Database**
   ```sql
   CREATE DATABASE defi_builder;
   CREATE USER defi_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE defi_builder TO defi_user;
   ```

2. **Run Migrations**
   ```bash
   cd backend
   npm run migrate
   ```

## SSL/TLS Configuration

Always use HTTPS in production:

1. **Get SSL Certificate** (Let's Encrypt)
   ```bash
   certbot certonly --standalone -d your-domain.com
   ```

2. **Configure Backend** (if self-hosting)
   - Use reverse proxy (Nginx) with SSL termination
   - Or configure Node.js with HTTPS directly

## Monitoring

### Recommended Services

1. **Error Tracking**: Sentry
   - Sign up at sentry.io
   - Add DSN to environment variables
   - Install SDK in frontend/backend

2. **Analytics**: PostHog or Mixpanel
   - Track user events
   - Monitor feature usage

3. **Uptime Monitoring**: UptimeRobot or Pingdom
   - Monitor API endpoints
   - Set up alerts

## Health Checks

The backend includes a health check endpoint:

```bash
curl https://api.your-domain.com/health
```

Configure your deployment platform to use this for health checks.

## Scaling

### Horizontal Scaling

1. **Frontend**: Use CDN (Cloudflare, CloudFront)
2. **Backend**: Use load balancer with multiple instances
3. **Database**: Use connection pooling (PgBouncer)

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add caching layer (Redis)

## Backup Strategy

1. **Database Backups**
   ```bash
   # Daily automated backups
   pg_dump -h host -U user -d database > backup_$(date +%Y%m%d).sql
   ```

2. **Store Backups**
   - AWS S3
   - Google Cloud Storage
   - Backblaze B2

## Security Checklist

- [ ] All API keys in environment variables (not in code)
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (Content Security Policy)
- [ ] Regular security audits (`npm audit`)
- [ ] Dependencies kept up to date
- [ ] Error messages don't leak sensitive info

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `FRONTEND_URL` matches frontend domain
   - Verify CORS configuration in backend

2. **Database Connection Issues**
   - Verify `DATABASE_URL` format
   - Check database is accessible
   - Verify credentials

3. **Build Failures**
   - Check Node.js version (must be 20+)
   - Clear `node_modules` and reinstall
   - Check environment variables are set

## Support

For deployment issues, check:
- [GitHub Issues](https://github.com/your-repo/issues)
- [Documentation](./README.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

