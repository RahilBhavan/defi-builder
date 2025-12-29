# localStorage & Type Safety Implementation Plan

## Overview

This plan addresses two critical issues from EVALUATION.md:
1. **localStorage Data Loss Risk** (lines 42-56)
2. **Type Safety Issues** (lines 58-70)

## Part 1: localStorage Data Loss Risk

### 1.1 Data Versioning System

**Problem**: No versioning means we can't migrate old data when schema changes.

**Solution**:
- Add version field to all stored data structures
- Create version registry to track schema versions
- Implement version detection on read
- Auto-migrate old data to current version

**Implementation**:
```typescript
interface VersionedData {
  version: string;
  data: unknown;
  migratedAt?: number;
}

const CURRENT_VERSION = '2.0.0';
const VERSION_HISTORY = ['1.0.0', '2.0.0'];
```

### 1.2 Migration System

**Problem**: Schema changes break existing data.

**Solution**:
- Create migration functions for each version
- Chain migrations from old → new
- Validate migrated data
- Store migration timestamp

**Implementation**:
```typescript
type MigrationFunction = (oldData: unknown) => unknown;

const migrations: Record<string, MigrationFunction> = {
  '1.0.0->2.0.0': migrateV1ToV2,
  '2.0.0->2.1.0': migrateV2ToV2_1,
};
```

### 1.3 Backup/Export System

**Problem**: No way to backup or recover data.

**Solution**:
- Auto-backup before major operations
- Manual export/import functionality
- Export to JSON file
- Import with validation
- Recovery from backup

**Implementation**:
- `exportAllData()`: Export all localStorage data
- `importAllData()`: Import and validate
- `createBackup()`: Auto-backup before changes
- `restoreBackup()`: Restore from backup
- `listBackups()`: Show available backups

### 1.4 User Warnings

**Problem**: Users can accidentally clear data.

**Solution**:
- Warn before clearing localStorage
- Confirm destructive operations
- Show data size/stats
- Provide recovery options

**Implementation**:
- `warnBeforeClear()`: Show confirmation dialog
- `getStorageStats()`: Show data size, item count
- Toast notifications for important operations

### 1.5 Data Recovery

**Problem**: No recovery mechanism if data is lost.

**Solution**:
- Keep last N backups in memory
- Auto-backup on changes
- Recovery UI component
- Restore from file

**Implementation**:
- In-memory backup cache (last 5 backups)
- Auto-backup on every save
- Recovery modal component
- File-based restore

## Part 2: Type Safety Issues

### 2.1 Specific Parameter Interfaces

**Problem**: `BlockParams` is too loose (`[key: string]: string | number | boolean`).

**Solution**:
- Create specific interfaces for each block type
- Type-safe parameter access
- Compile-time type checking

**Implementation**:
```typescript
interface PriceTriggerParams {
  asset: string;
  targetPrice: number;
  condition: '>=' | '<=' | '>' | '<' | '==';
}

interface UniswapSwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number;
}

interface AaveSupplyParams {
  asset: string;
  amount: number;
  collateral: boolean;
}

interface StopLossParams {
  percentage: number;
}
```

### 2.2 Runtime Validation with Zod

**Problem**: No runtime validation of parameter types.

**Solution**:
- Use Zod for schema validation
- Validate on read/write
- Type-safe parsing
- Clear error messages

**Implementation**:
```typescript
import { z } from 'zod';

const PriceTriggerParamsSchema = z.object({
  asset: z.string().min(1),
  targetPrice: z.number().positive(),
  condition: z.enum(['>=', '<=', '>', '<', '==']),
});

// Validate at runtime
const params = PriceTriggerParamsSchema.parse(block.params);
```

### 2.3 Type Guards

**Problem**: Missing type guards for block types.

**Solution**:
- Create type guard functions
- Discriminated unions
- Runtime type checking

**Implementation**:
```typescript
function isPriceTriggerBlock(block: LegoBlock): block is PriceTriggerBlock {
  return block.type === 'price_trigger';
}

function isUniswapSwapBlock(block: LegoBlock): block is UniswapSwapBlock {
  return block.type === 'uniswap_swap';
}
```

### 2.4 Discriminated Union Types

**Solution**:
- Create union type for all block types
- Type-safe block handling
- Exhaustive type checking

**Implementation**:
```typescript
type TypedLegoBlock = 
  | PriceTriggerBlock
  | UniswapSwapBlock
  | AaveSupplyBlock
  | StopLossBlock;
```

## Implementation Order

1. ✅ Create implementation plan
2. Install Zod dependency
3. Create type-safe block parameter interfaces
4. Add Zod schemas for validation
5. Implement data versioning system
6. Create migration functions
7. Add backup/export functionality
8. Implement user warnings
9. Add data recovery mechanism
10. Update all code to use new types
11. Add comprehensive tests

## Files to Create/Modify

### New Files:
- `services/storage/versioning.ts` - Version management
- `services/storage/migrations.ts` - Migration functions
- `services/storage/backup.ts` - Backup/export system
- `services/storage/recovery.ts` - Recovery mechanism
- `types/blockParams.ts` - Type-safe parameter interfaces
- `types/blockSchemas.ts` - Zod schemas
- `types/blockGuards.ts` - Type guards
- `components/storage/BackupModal.tsx` - Backup UI
- `components/storage/RecoveryModal.tsx` - Recovery UI
- `hooks/useStorageVersioning.ts` - Versioning hook
- `hooks/useBackup.ts` - Backup hook

### Modified Files:
- `hooks/useLocalStorage.ts` - Add versioning
- `services/strategyStorage.ts` - Add versioning and backup
- `types.ts` - Add new type definitions
- `components/Workspace.tsx` - Use new types
- All files using `BlockParams` - Use specific types

## Testing Strategy

1. Unit tests for versioning
2. Unit tests for migrations
3. Unit tests for backup/export
4. Unit tests for type validation
5. Integration tests for full flow
6. E2E tests for user warnings

## Migration Path

1. Add versioning to existing data (v1.0.0)
2. Migrate to new types (v2.0.0)
3. Update all code gradually
4. Remove old `BlockParams` type
5. Add runtime validation everywhere

