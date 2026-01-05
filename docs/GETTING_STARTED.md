# Getting Started with DeFi Builder

This guide will help you get DeFi Builder up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** 1.0+ (recommended) or **Node.js** 20+
- **PostgreSQL** 14+ (or SQLite for development)
- **Redis** 6+ (optional, for caching)
- **Git**

### Installing Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Installing PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Installing Redis (Optional)

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/RahilBhavan/defi-builder.git
cd defi-builder
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
bun install

# Install backend dependencies
cd backend
bun install
cd ..
```

### 3. Set Up Backend

#### Option A: SQLite (Recommended for Development)

1. Create `.env` file in `backend/`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update `backend/prisma/schema.prisma` to use SQLite:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. Update `backend/.env`:
   ```env
   DATABASE_URL="file:./dev.db"
   PORT=3001
   JWT_SECRET="dev-secret-change-in-production"
   FRONTEND_URL="http://localhost:5173"
   ```

4. Run migrations:
   ```bash
   bun run prisma:migrate
   bun run prisma:generate
   ```

#### Option B: PostgreSQL (Production-like)

1. Create database:
   ```bash
   createdb defi_builder
   ```

2. Create `.env` file:
   ```bash
   cd backend
   cp .env.example .env
   ```

3. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/defi_builder?schema=public"
   PORT=3001
   JWT_SECRET="dev-secret-change-in-production"
   FRONTEND_URL="http://localhost:5173"
   ```

4. Run migrations:
   ```bash
   bun run prisma:migrate
   bun run prisma:generate
   ```

### 4. Set Up Frontend

1. Create `.env.local` file in root:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local`:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

### 5. (Optional) Configure API Keys

For AI suggestions and price feeds, add API keys to `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
COINGECKO_API_KEY=your-coingecko-api-key
```

**Note**: The app works without these keys, but some features will be limited.

### 6. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev
```

**Terminal 2 - Frontend:**
```bash
bun run dev
```

### 7. Open the Application

Navigate to `http://localhost:5173` in your browser.

## Environment Variables

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_SENTRY_DSN` | No | - | Sentry DSN for error tracking |

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | Database connection string |
| `PORT` | No | 3001 | Server port |
| `JWT_SECRET` | No | dev-secret | JWT secret (⚠️ Use strong secret in production) |
| `REDIS_URL` | No | - | Redis connection URL (optional) |
| `GEMINI_API_KEY` | No | - | Gemini API key for AI suggestions |
| `COINGECKO_API_KEY` | No | - | CoinGecko API key for price data |
| `FRONTEND_URL` | No | http://localhost:5173 | Frontend URL for CORS |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `NODE_ENV` | No | development | Environment (development/production) |

## Verifying Installation

### Check Backend

1. Backend should be running on `http://localhost:3001`
2. Health check: `curl http://localhost:3001/health` should return `OK`

### Check Frontend

1. Frontend should be running on `http://localhost:5173`
2. Open the browser and verify the landing page loads

### Test Database Connection

```bash
cd backend
bun run prisma:studio
```

This opens Prisma Studio where you can view and edit your database.

## Common Issues

### Database Connection Error

**Problem**: Cannot connect to database

**Solutions**:
- Verify database is running: `pg_isready` (PostgreSQL) or check SQLite file exists
- Check `DATABASE_URL` in `.env` is correct
- For PostgreSQL, ensure database exists: `createdb defi_builder`
- For SQLite, ensure directory is writable

### Port Already in Use

**Problem**: Port 3001 or 5173 is already in use

**Solutions**:
- Change port in `.env` (backend) or `vite.config.ts` (frontend)
- Kill the process using the port:
  ```bash
  # macOS/Linux
  lsof -ti:3001 | xargs kill
  lsof -ti:5173 | xargs kill
  ```

### Prisma Client Not Generated

**Problem**: `PrismaClient` not found

**Solution**:
```bash
cd backend
bun run prisma:generate
```

### Module Not Found Errors

**Problem**: Import errors after cloning

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules bun.lock
bun install
cd backend && rm -rf node_modules bun.lock && bun install
```

## Next Steps

- Read the [Architecture Guide](ARCHITECTURE.md) to understand the system
- Check out the [API Documentation](API.md) for backend endpoints
- Review [Component Documentation](COMPONENTS.md) for UI components
- See [Deployment Guide](DEPLOYMENT.md) for production setup

## Getting Help

- Check the [Documentation](README.md) for detailed guides
- Review [Common Issues](#common-issues) above
- Open an issue on GitHub for bugs or feature requests

