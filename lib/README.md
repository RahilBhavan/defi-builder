# Lib Directory

Shared utilities and libraries organized by category.

## Structure

```
lib/
├── api/          # API client, tRPC configuration
├── validation/   # Validation utilities
├── error/        # Error handling and retry logic
├── storage/      # Storage utilities and services
├── monitoring/   # Logging and monitoring
├── format/       # Formatting utilities (CSV, metrics)
└── spine/        # Spine/ReactFlow utilities
```

## Usage

### Importing from Lib

```typescript
// Import from specific category
import { trpc, trpcClient } from '@/lib/api';
import { validateNumberRange } from '@/lib/validation';
import { getUserFriendlyErrorMessage } from '@/lib/error';
import { logger } from '@/lib/monitoring';

// Or import from main index
import { trpc, validateNumberRange, logger } from '@/lib';
```

### Categories

- **api/**: tRPC client setup, API configuration
- **validation/**: Input validation functions
- **error/**: Error handling, retry logic, user-friendly messages
- **storage/**: JSON utilities, storage services
- **monitoring/**: Logging, Sentry integration, rate limiting
- **format/**: CSV export, metrics formatting
- **spine/**: ReactFlow conversion utilities

## Migration from utils/

The old `utils/` directory is maintained for backward compatibility. New code should use `@/lib/*` imports.

**Old:**
```typescript
import { trpc } from '@/utils/trpc';
import { validateNumberRange } from '@/utils/validation';
```

**New:**
```typescript
import { trpc } from '@/lib/api';
import { validateNumberRange } from '@/lib/validation';
```

