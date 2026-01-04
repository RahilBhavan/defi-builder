# Quick Local Deployment Guide

Get the DeFi Builder running locally in minutes for testing.

## Prerequisites

- **Bun** installed (this project uses Bun instead of npm)
- **Node.js 20+** (if backend needs it)
- **PostgreSQL** (optional - backend can use SQLite for local dev)

## Quick Start (Frontend Only)

If you just want to test the frontend:

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

The app will be available at: **http://localhost:3000** (or the port shown in terminal)

## Full Stack (Frontend + Backend)

### 1. Start Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
bun install

# Set up database (SQLite for local - no setup needed!)
# The dev.db file will be created automatically

# Start backend in development mode
bun dev
```

Backend will run on: **http://localhost:3001**

### 2. Start Frontend (in a new terminal)

```bash
# From project root
bun dev
```

Frontend will run on: **http://localhost:3000** (or port shown)

### 3. Access the Application

Open your browser to: **http://localhost:3000**

## Environment Variables (Optional)

For local development, most things work out of the box. If you need to configure:

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
```

### Backend (.env in backend/ directory)
```env
# Database (SQLite is default for dev)
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret (generate a random string)
JWT_SECRET="your-local-dev-secret-key-min-32-chars"

# Optional: Gemini API for AI features
GEMINI_API_KEY="your-key-here"

# CORS
FRONTEND_URL="http://localhost:3000"

# Port
PORT=3001
NODE_ENV=development
```

## Common Commands

### Frontend
```bash
bun dev              # Start dev server
bun build            # Build for production
bun preview          # Preview production build
bun type-check       # Check TypeScript
bun lint             # Lint code
bun test             # Run tests
```

### Backend
```bash
cd backend
bun dev              # Start dev server with hot reload
bun start            # Start production build
bun test             # Run tests
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3002 bun dev
```

### Database Issues
```bash
cd backend
# Reset database
rm prisma/dev.db
bunx prisma migrate dev
```

### Clear Cache
```bash
# Frontend
rm -rf node_modules dist
bun install

# Backend
cd backend
rm -rf node_modules dist
bun install
```

## Production Build (Local Testing)

To test the production build locally:

```bash
# Build frontend
bun build

# Preview production build
bun preview

# Build backend
cd backend
bun build
bun start
```

## Quick Test Checklist

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend health check: http://localhost:3001/health
- [ ] Can create a strategy
- [ ] Can add blocks
- [ ] Can run backtest
- [ ] No console errors

## Need Help?

- Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- See [README.md](./README.md) for project overview
- Check [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) for detailed setup

