# DeFi Builder

A visual, AI-powered DeFi strategy builder and workspace. Build, test, and optimize DeFi strategies using a block-based interface.

## Features

- **Visual Strategy Builder**: Drag-and-drop interface for building DeFi strategies
- **AI-Powered Suggestions**: Get intelligent block suggestions using Gemini AI
- **Backtesting**: Test your strategies with historical data
- **Optimization**: Multi-objective optimization with Bayesian and Genetic algorithms
- **Export/Import**: Save and share your strategies as JSON
- **Real-time Validation**: Validate strategies as you build
- **Persistent Storage**: Strategies are automatically saved to localStorage

## Prerequisites

- Node.js 20+ 
- npm or yarn
- PostgreSQL 14+ (for backend)
- Redis 6+ (for caching)
- Gemini API key (optional, for AI suggestions)
- OpenAI API key (optional, for backend AI service)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd defi-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database and Redis URLs
   npx prisma migrate dev
   npm run dev
   ```

4. Set up frontend environment variables:
   Create a `.env.local` file in the root directory:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_API_URL=http://localhost:3001
   ```

5. Run the frontend development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
defi-builder/
├── backend/            # Backend server (Node.js + Express + tRPC)
│   ├── src/
│   │   ├── auth/       # Authentication (JWT)
│   │   ├── cache/      # Redis caching
│   │   ├── db/         # Database client (Prisma)
│   │   ├── services/   # Business logic services
│   │   └── trpc/       # tRPC API routes
│   └── prisma/         # Database schema
├── components/         # React components
│   ├── modals/        # Modal components
│   ├── studio/        # ReactFlow components
│   ├── workspace/     # Workspace-specific components
│   └── ui/            # Reusable UI components
├── contracts/         # Smart contracts (Solidity)
├── hooks/             # Custom React hooks
├── services/          # Business logic and services
│   ├── protocols/     # Protocol integrations
│   └── optimization/  # Optimization algorithms
├── types.ts          # TypeScript type definitions
└── constants.ts      # Application constants
```

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open block palette
- `Cmd/Ctrl + E`: Execute strategy
- `Escape`: Close all panels
- `Delete/Backspace`: Delete selected block

## Development

### Code Style

This project uses:
- TypeScript with strict mode enabled
- React 19 with functional components
- Tailwind CSS for styling
- Framer Motion for animations

### Environment Variables

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key (optional, for AI suggestions)

## License

[Add your license here]
