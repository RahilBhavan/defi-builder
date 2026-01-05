# Quick Reference Guide

Quick reference for common tasks and commands in DeFi Builder.

## Development Commands

```bash
# Start development servers
bun run dev                    # Frontend
cd backend && bun run dev      # Backend

# Building
bun run build                  # Build frontend
cd backend && bun run build     # Build backend

# Testing
bun run test                   # Run tests
bun run test:coverage          # With coverage
bun run test:e2e               # E2E tests

# Code Quality
bun run lint                   # Lint code
bun run lint:fix               # Fix linting
bun run type-check             # TypeScript check
```

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
VITE_SENTRY_DSN=your-sentry-dsn
```

### Backend (.env)
```env
DATABASE_URL=file:./dev.db
PORT=3001
JWT_SECRET=dev-secret
GEMINI_API_KEY=your-key
FRONTEND_URL=http://localhost:5173
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open AI Palette |
| `⌘E` / `Ctrl+E` | Execute Strategy |
| `Escape` | Close panels |
| `Delete` / `Backspace` | Delete block |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘Shift+Z` / `Ctrl+Shift+Z` | Redo |

## Common Tasks

### Create a New Strategy

1. Click "Start Building" or press `⌘K`
2. Drag blocks from palette
3. Configure block parameters
4. Validate strategy
5. Save to library

### Run a Backtest

1. Build your strategy
2. Click "Backtest" in toolbar
3. Configure backtest parameters
4. View results and analytics

### Start Paper Trading

1. Build your strategy
2. Click "Execute Strategy" button
3. Configure paper trading session
4. Monitor live performance

### Publish to Marketplace

1. Save your strategy
2. Open Strategy Library
3. Click visibility toggle
4. Set to public
5. Add category and tags

## File Locations

| Item | Location |
|------|----------|
| Components | `components/` |
| Hooks | `hooks/` |
| Services | `services/` |
| Types | `types.ts` |
| Backend API | `backend/src/trpc/` |
| Database Schema | `backend/prisma/schema.prisma` |
| Smart Contracts | `contracts/src/` |

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill

# Kill process on port 5173
lsof -ti:5173 | xargs kill
```

### Database Issues
```bash
cd backend
bun run prisma:generate
bun run prisma:migrate dev
```

### Clear Cache
```bash
rm -rf node_modules bun.lock
bun install
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/trpc/*` | POST | tRPC endpoints |
| `/ws` | WebSocket | Real-time updates |

## Useful Links

- [Full Documentation](README.md)
- [Getting Started](GETTING_STARTED.md)
- [API Reference](API.md)
- [Architecture](ARCHITECTURE.md)


