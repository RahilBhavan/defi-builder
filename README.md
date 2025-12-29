<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

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

- Node.js 18+ 
- npm or yarn
- Gemini API key (optional, for AI suggestions)

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

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
defi-builder/
├── components/          # React components
│   ├── modals/         # Modal components
│   ├── workspace/       # Workspace-specific components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── services/           # Business logic and services
│   └── optimization/   # Optimization algorithms
├── types.ts           # TypeScript type definitions
└── constants.ts       # Application constants
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
