# Features Directory

This directory contains feature-based organization of the codebase. Each feature is self-contained with its own components, services, hooks, and types.

## Structure

```
features/
├── strategy-builder/    # Visual strategy building
├── backtesting/          # Strategy backtesting
├── optimization/        # Strategy optimization
├── portfolio/           # Portfolio tracking
├── blockchain/          # Blockchain/web3 integration
└── ai/                  # AI-powered features
```

## Benefits

1. **Feature Co-location**: All code for a feature is in one place
2. **Easier Navigation**: Find all backtesting code in `features/backtesting/`
3. **Better Scalability**: New features don't clutter existing directories
4. **Clearer Dependencies**: Easier to see feature dependencies
5. **Team Collaboration**: Teams can own entire features

## Usage

### Importing from Features

```typescript
// Import from a specific feature
import { Workspace, useWorkspaceState } from '@/features/strategy-builder';
import { BacktestModal, runDeFiBacktest } from '@/features/backtesting';
import { OptimizationPanel } from '@/features/optimization';
```

### Adding a New Feature

1. Create feature directory: `features/my-feature/`
2. Create subdirectories: `components/`, `services/`, `hooks/`, `types/`
3. Add feature code
4. Create `index.ts` for exports
5. Update this README

## Migration Status

This is a hybrid approach - we maintain both:
- **Type-based structure** (`components/`, `services/`, `hooks/`) for shared code
- **Feature-based structure** (`features/`) for feature-specific code

Existing imports continue to work via backward compatibility exports.

