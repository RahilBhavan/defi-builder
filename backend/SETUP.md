# Backend Setup Guide

## Quick Start

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Choose Database Option

#### Option A: SQLite (Recommended for Development)

No additional setup needed! The `.env.example` already has SQLite configured.

Just update the Prisma schema to use SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### Option B: PostgreSQL (Production)

1. Install PostgreSQL (if not already installed):
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Create database:
   ```bash
   createdb defi_builder
   ```

3. Update `.env`:
   ```env
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/defi_builder?schema=public"
   ```

4. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### 3. (Optional) Setup Redis

Redis is optional - the app will work without it, but caching will be disabled.

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

Then update `.env`:
```env
REDIS_URL="redis://localhost:6379"
```

### 4. Generate JWT Secret (Optional)

For production, generate a secure JWT secret:

```bash
openssl rand -base64 32
```

Add it to `.env`:
```env
JWT_SECRET="your-generated-secret-here"
```

### 5. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Environment Variables

### Option 1: Doppler (Recommended)

For secure secrets management, use Doppler. See [Doppler Setup Guide](../DOPPLER_SETUP.md).

**Quick Start:**
```bash
# Install and authenticate
doppler login
doppler setup

# Run with Doppler
doppler run -- npm run dev
```

### Option 2: Environment Variables

Create `.env` file or set environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | Database connection string |
| `PORT` | No | 3001 | Server port |
| `JWT_SECRET` | No | dev-secret | Secret for JWT tokens (⚠️ Use strong secret in production) |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection URL |
| `GEMINI_API_KEY` | No | - | API key for AI suggestions |
| `FRONTEND_URL` | No | http://localhost:3000 | Frontend URL for CORS |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `NODE_ENV` | No | development | Environment (development/production) |

**For Doppler:**
| Variable | Required | Description |
|----------|----------|-------------|
| `DOPPLER_TOKEN` | No | Service token for Doppler API access |
| `DOPPLER_PROJECT` | No | Doppler project name |
| `DOPPLER_CONFIG` | No | Doppler config name (dev/staging/prod) |

**Note:** Application automatically uses Doppler if configured, otherwise falls back to environment variables.
| `GEMINI_API_KEY` | No | - | API key for AI suggestions |

## Troubleshooting

### Database Connection Error

- Check that your database is running
- Verify `DATABASE_URL` in `.env` is correct
- For PostgreSQL, ensure the database exists: `createdb defi_builder`

### Redis Connection Error

- Redis is optional - the app will work without it
- If you want Redis, ensure it's running: `redis-cli ping` should return `PONG`

### Prisma Client Not Generated

Run:
```bash
npx prisma generate
```

### Migration Issues

Reset database (⚠️ deletes all data):
```bash
npx prisma migrate reset
```

