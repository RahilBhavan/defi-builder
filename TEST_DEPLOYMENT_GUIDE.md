# Test Deployment Guide - DeFi Builder

This guide walks you through deploying DeFi Builder to a test/staging environment for testing purposes.

## Quick Overview

**Recommended Stack for Testing:**
- **Frontend:** Vercel (free tier, instant deployment)
- **Backend:** Railway or Render (free tier available)
- **Database:** PostgreSQL (included with Railway/Render)
- **Redis:** Optional (can skip for testing)

**Estimated Time:** 30-45 minutes

---

## Option 1: Quick Test Deployment (Recommended)

### Step 1: Deploy Backend First

#### Using Railway (Easiest - Recommended)

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `defi-builder` repository

3. **Add PostgreSQL Database**
   - In your project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create a database

4. **Configure Backend Service**
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Railway will auto-detect it's a Node.js project
   - Set **Root Directory:** `backend`
   - Set **Build Command:** `npm install && npm run build`
   - Set **Start Command:** `npm start`

5. **Set Environment Variables**
   - Click on your backend service
   - Go to "Variables" tab
   - Add these variables:

   ```env
   # Database (Railway provides this automatically)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # Security (generate a strong secret)
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-testing
   
   # CORS (will update after frontend deployment)
   FRONTEND_URL=https://your-frontend-url.vercel.app
   
   # Server
   PORT=3001
   NODE_ENV=production
   
   # Optional: AI features
   GEMINI_API_KEY=your-gemini-api-key-if-you-have-one
   
   # Optional: Redis (skip for testing)
   # REDIS_URL=redis://...
   ```

6. **Run Database Migrations**
   - In Railway, open your backend service
   - Go to "Deployments" → Click on latest deployment
   - Click "View Logs"
   - In the terminal, run:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
   - Or add this to your build command:
   ```bash
   npm install && npm run build && npx prisma migrate deploy && npx prisma generate
   ```

7. **Get Backend URL**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Copy this URL - you'll need it for the frontend

#### Using Render (Alternative)

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `defi-builder-backend`
     - **Root Directory:** `backend`
     - **Environment:** `Node`
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`

3. **Add PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name it `defi-builder-db`
   - Copy the **Internal Database URL**

4. **Set Environment Variables**
   - In your web service, go to "Environment"
   - Add:
   ```env
   DATABASE_URL=<paste-internal-database-url>
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   FRONTEND_URL=https://your-frontend-url.vercel.app
   PORT=3001
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy
   - Get your backend URL (e.g., `https://defi-builder-backend.onrender.com`)

---

### Step 2: Deploy Frontend

#### Using Vercel (Recommended)

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your `defi-builder` repository
   - Vercel will auto-detect Vite configuration

3. **Configure Build Settings**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm ci`

4. **Set Environment Variables**
   - Go to "Settings" → "Environment Variables"
   - Add:
   ```env
   VITE_API_URL=https://your-backend-url.railway.app
   ```
   (Use your Railway or Render backend URL from Step 1)

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy
   - You'll get a URL like: `https://defi-builder.vercel.app`

6. **Update Backend CORS**
   - Go back to Railway/Render
   - Update `FRONTEND_URL` environment variable:
   ```env
   FRONTEND_URL=https://defi-builder.vercel.app
   ```
   - Redeploy backend (or it will auto-redeploy)

#### Using Netlify (Alternative)

1. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

3. **Configure Build Settings**
   - **Base directory:** (leave empty)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

4. **Set Environment Variables**
   - Go to "Site settings" → "Environment variables"
   - Add:
   ```env
   VITE_API_URL=https://your-backend-url.railway.app
   ```

5. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy
   - You'll get a URL like: `https://defi-builder.netlify.app`

---

## Option 2: Local Test Deployment

If you want to test deployment locally before cloud deployment:

### Prerequisites
- Node.js 20+
- PostgreSQL (or use SQLite for quick testing)
- Redis (optional)

### Step 1: Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="file:./dev.db"
# Or for PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/defi_builder"

JWT_SECRET="test-secret-key-minimum-32-characters-long"
FRONTEND_URL="http://localhost:5173"
PORT=3001
NODE_ENV=production
EOF

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Start
npm start
```

Backend will run on `http://localhost:3001`

### Step 2: Frontend Setup

```bash
# In project root
npm install

# Create .env.production file
cat > .env.production << EOF
VITE_API_URL=http://localhost:3001
EOF

# Build
npm run build

# Preview (or use a local server)
npm run preview
```

Frontend will run on `http://localhost:4173` (or your preview port)

---

## Option 3: Docker Compose (Full Stack)

For a complete local test environment:

### Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: defi_builder
      POSTGRES_USER: defi_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://defi_user:test_password@postgres:5432/defi_builder
      REDIS_URL: redis://redis:6379
      JWT_SECRET: test-secret-key-minimum-32-characters-long
      FRONTEND_URL: http://localhost:5173
      PORT: 3001
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production=false

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Expose port
EXPOSE 3001

# Start
CMD ["npm", "start"]
```

### Deploy:

```bash
# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Check logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

---

## Verification Checklist

After deployment, verify everything works:

### ✅ Backend Health Check

```bash
curl https://your-backend-url.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

### ✅ Frontend Loads

1. Visit your frontend URL
2. Should see the landing page
3. Click "Enter Workspace"
4. Should load the workspace

### ✅ API Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try creating a strategy
4. Check for API calls to your backend URL
5. Should see successful responses (200 status)

### ✅ Database Connection

1. Check backend logs
2. Should see "Database connected" message
3. Try saving a strategy
4. Should persist to database

---

## Troubleshooting

### Backend Won't Start

**Issue:** Database connection error
```bash
# Check DATABASE_URL format
# PostgreSQL: postgresql://user:password@host:port/database
# SQLite: file:./dev.db

# Verify database is accessible
# For Railway: Check database service is running
# For Render: Check database URL is correct
```

**Issue:** Prisma client not generated
```bash
# In backend directory
npx prisma generate
```

**Issue:** Migration errors
```bash
# Reset database (⚠️ deletes data)
npx prisma migrate reset

# Or deploy migrations
npx prisma migrate deploy
```

### Frontend Won't Connect to Backend

**Issue:** CORS errors
- Check `FRONTEND_URL` in backend matches frontend domain
- Check backend CORS configuration
- Verify backend is accessible

**Issue:** API calls failing
- Check `VITE_API_URL` in frontend environment variables
- Verify backend URL is correct
- Check browser console for errors

### Build Failures

**Issue:** TypeScript errors
```bash
# Check types
npm run type-check

# Fix issues
npm run lint:fix
```

**Issue:** Missing dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Environment Variables Reference

### Frontend Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend.railway.app` |

### Backend Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-secret-key-here` |

### Backend Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `REDIS_URL` | Redis connection URL | (optional) |
| `GEMINI_API_KEY` | Gemini AI API key | (optional) |
| `NODE_ENV` | Environment | `development` |
| `SENTRY_DSN` | Sentry error tracking | (optional) |

---

## Quick Test Commands

### Test Backend Locally

```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:3001
```

### Test Frontend Locally

```bash
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Test Production Build Locally

```bash
# Build frontend
npm run build

# Preview
npm run preview

# Build backend
cd backend
npm run build
npm start
```

---

## Next Steps After Deployment

1. **Test Core Features**
   - Create a strategy
   - Run a backtest
   - Save to library
   - Test marketplace features

2. **Monitor Logs**
   - Check backend logs for errors
   - Monitor frontend console
   - Verify database operations

3. **Performance Testing**
   - Test with multiple strategies
   - Check load times
   - Verify API response times

4. **Security Check**
   - Verify HTTPS is enabled
   - Check CORS configuration
   - Test authentication

---

## Cost Estimates (Free Tier)

- **Vercel:** Free (hobby plan)
- **Railway:** $5/month (or free trial)
- **Render:** Free tier available
- **Netlify:** Free tier available

**Total:** ~$0-5/month for testing

---

## Support

If you encounter issues:

1. Check deployment logs
2. Verify environment variables
3. Test locally first
4. Check [Troubleshooting Guide](./DEPLOYMENT.md#troubleshooting)
5. Review [Backend Setup](./backend/SETUP.md)

---

**Ready to deploy?** Start with **Option 1** (Railway + Vercel) for the quickest test deployment!

