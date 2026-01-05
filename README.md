# DeFi Builder

> A visual, AI-powered DeFi strategy builder and workspace. Build, test, optimize, and execute DeFi strategies using an intuitive block-based interface.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🚀 Features

### Core Capabilities

- **🎨 Visual Strategy Builder**: Drag-and-drop interface for building complex DeFi strategies
- **🤖 AI-Powered Suggestions**: Get intelligent block suggestions using Google Gemini AI
- **📊 Backtesting**: Test strategies with historical data and comprehensive analytics
- **⚡ Optimization**: Multi-objective optimization with Bayesian and Genetic algorithms
- **📈 Paper Trading**: Test strategies in a risk-free simulated environment
- **💼 Portfolio Tracking**: Monitor positions and performance across strategies
- **🏪 Strategy Marketplace**: Discover, fork, and share strategies with the community
- **🔔 Real-time Alerts**: Get notified about price movements, positions, and strategy events
- **📱 Progressive Web App**: Install as a native app on any device

### Smart Contracts

Production-grade Solidity contracts for on-chain execution:

- **Strategy Executor**: Execute multi-step strategies on-chain
- **Multi-Protocol Router**: Best price routing across DEXs
- **Yield Optimizer Vault**: Auto-compounding yield vault
- **Flash Loan Arbitrage**: Advanced arbitrage bot
- **Position Manager**: Leveraged position management

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ⚡ Quick Start

### Prerequisites

- **Bun** 1.0+ (or Node.js 20+)
- **PostgreSQL** 14+ (or SQLite for development)
- **Redis** 6+ (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RahilBhavan/defi-builder.git
   cd defi-builder
   ```

2. **Install dependencies**
   ```bash
   bun install
   cd backend && bun install && cd ..
   ```

3. **Set up backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   bun run prisma:migrate
   bun run dev
   ```

4. **Set up frontend**
   ```bash
   # In root directory
   cp .env.example .env.local
   # Edit .env.local with your API URL
   bun run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

For detailed setup instructions, see [Getting Started Guide](docs/GETTING_STARTED.md).

## 📁 Project Structure

```
defi-builder/
├── backend/              # Backend server (Node.js + Express + tRPC)
│   ├── src/
│   │   ├── services/    # Business logic services
│   │   ├── trpc/        # tRPC API routes
│   │   ├── auth/        # Authentication
│   │   └── cache/       # Redis caching
│   └── prisma/          # Database schema
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── modals/         # Modal dialogs
│   ├── workspace/      # Workspace components
│   └── marketplace/    # Marketplace components
├── features/           # Feature-based modules
│   ├── strategy-builder/
│   ├── backtesting/
│   ├── optimization/
│   └── portfolio/
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── lib/                # Shared utilities
├── contracts/          # Smart contracts (Solidity)
└── docs/               # Documentation
```

For detailed structure, see [Project Structure](docs/ARCHITECTURE.md#project-structure).

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Getting Started](docs/GETTING_STARTED.md)** - Setup and installation guide
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Components](docs/COMPONENTS.md)** - Component library and usage
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment guide
- **[Contributing](docs/CONTRIBUTING.md)** - Contribution guidelines
- **[Testing](docs/testing.md)** - Testing guide and best practices

## 🛠️ Development

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, tRPC, Prisma, PostgreSQL
- **Blockchain**: Wagmi, Viem, Solidity (Foundry)
- **Testing**: Vitest, Playwright, React Testing Library
- **Code Quality**: Biome (linting & formatting)

### Available Scripts

```bash
# Development
bun run dev              # Start frontend dev server
cd backend && bun run dev # Start backend server

# Building
bun run build            # Build for production
bun run build:analyze    # Build with bundle analysis

# Testing
bun run test             # Run unit tests
bun run test:coverage    # Run tests with coverage
bun run test:e2e         # Run E2E tests

# Code Quality
bun run lint             # Lint code
bun run lint:fix         # Fix linting issues
bun run type-check       # TypeScript type checking
```

### Environment Variables

See [Getting Started Guide](docs/GETTING_STARTED.md#environment-variables) for complete environment variable documentation.

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Vitest with React Testing Library
- **Integration Tests**: Full workflow testing
- **E2E Tests**: Playwright for end-to-end scenarios
- **Coverage**: Aim for 80%+ coverage on critical paths

Run tests:
```bash
bun run test              # Unit tests
bun run test:coverage     # With coverage report
bun run test:e2e          # E2E tests
```

See [Testing Guide](docs/testing.md) for details.

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   ```bash
   bun run build
   cd backend && bun run build
   ```

2. **Set up environment variables**
   Configure production environment variables (see [Deployment Guide](docs/DEPLOYMENT.md))

3. **Deploy**
   - Frontend: Deploy `dist/` to your hosting service (Vercel, Netlify, etc.)
   - Backend: Deploy to your server (Railway, Render, AWS, etc.)

For detailed deployment instructions, see [Deployment Guide](docs/DEPLOYMENT.md).

## 🤝 Contributing

We welcome contributions! Please see [Contributing Guide](docs/CONTRIBUTING.md) for:

- Code of conduct
- Development setup
- Pull request process
- Coding standards
- Commit message conventions

## 📝 License

[Add your license here]

## 🔗 Links

- [Documentation](docs/)
- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [tRPC](https://trpc.io/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Animated with [Framer Motion](https://www.framer.com/motion/)

---

**Made with ❤️ for the DeFi community**
