# Project Structure

This document describes the organization of the DeFi Builder codebase.

## Overview

The project uses a **hybrid organization approach**:
- **Type-based structure** (`components/`, `services/`, `hooks/`) for shared, reusable code
- **Feature-based structure** (`features/`) for feature-specific, cohesive modules
- **Library structure** (`lib/`) for categorized shared utilities

## Directory Structure

```
defi-builder/
├── lib/                    # Shared utilities (NEW)
│   ├── api/               # API client, tRPC
│   ├── validation/        # Validation utilities
│   ├── error/             # Error handling
│   ├── storage/           # Storage utilities
│   ├── monitoring/        # Logging, monitoring
│   ├── format/            # Formatting utilities
│   └── spine/             # ReactFlow utilities
│
├── features/              # Feature-based organization (NEW)
│   ├── strategy-builder/  # Strategy building feature
│   ├── backtesting/       # Backtesting feature
│   ├── optimization/      # Optimization feature
│   ├── portfolio/         # Portfolio tracking
│   ├── blockchain/        # Web3/blockchain integration
│   └── ai/                # AI-powered features
│
├── components/             # Shared React components
│   ├── modals/            # Modal components
│   ├── ui/                # Reusable UI components
│   └── ...
│
├── services/              # Shared business logic services
│   └── ...
│
├── hooks/                 # Shared React hooks
│   └── ...
│
├── utils/                 # Backward compatibility (deprecated)
│   └── index.ts           # Re-exports from lib/
│
├── types/                 # TypeScript type definitions
├── backend/               # Backend server
└── contracts/             # Smart contracts
```

## Import Guidelines

### Use `lib/` for Shared Utilities

```typescript
// ✅ Good - Categorized imports
import { trpc, trpcClient } from '@/lib/api';
import { validateNumberRange } from '@/lib/validation';
import { getUserFriendlyErrorMessage } from '@/lib/error';
import { logger } from '@/lib/monitoring';

// ❌ Avoid - Old utils imports (deprecated)
import { trpc } from '@/utils/trpc';
```

### Use `features/` for Feature-Specific Code

```typescript
// ✅ Good - Feature-based imports
import { Workspace, useWorkspaceState } from '@/features/strategy-builder';
import { BacktestModal, runDeFiBacktest } from '@/features/backtesting';
import { OptimizationPanel } from '@/features/optimization';

// ❌ Avoid - Direct component imports for features
import Workspace from '@/components/Workspace';
```

### Use Type-Based for Shared Code

```typescript
// ✅ Good - Shared components
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
```

## When to Use Each Structure

### Use `lib/` for:
- Shared utilities that don't belong to a specific feature
- Categorized helper functions
- Common validation, error handling, formatting

### Use `features/` for:
- Feature-specific components, services, hooks
- Cohesive modules that work together
- New features being added

### Use Type-Based (`components/`, `services/`, `hooks/`) for:
- Shared, reusable components (Button, Modal, etc.)
- Common hooks (useDebounce, useToast, etc.)
- Shared services that multiple features use

## Migration Status

- ✅ `lib/` structure created and populated
- ✅ `features/` structure created and populated
- ✅ Backward compatibility maintained in `utils/`
- ⚠️ Import updates in progress (existing code still works)

## Next Steps

1. Gradually update imports to use new structure
2. Add new features to `features/` directory
3. Migrate existing feature code to `features/` (optional, low priority)
4. Eventually deprecate direct `utils/` imports

## Benefits

1. **Better Organization**: Code is easier to find and navigate
2. **Scalability**: New features don't clutter existing directories
3. **Team Collaboration**: Teams can own entire features
4. **Clear Dependencies**: Easier to see what code belongs together
5. **Backward Compatible**: Existing code continues to work

