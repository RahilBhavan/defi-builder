/**
 * Data migration system
 * Handles migration from old schema versions to new ones
 */

import type { LegoBlock } from '../../types';
import { parseBlocks } from '../../types/blockSchemas';
import {
  CURRENT_VERSION,
  type VersionedData,
  needsMigration as checkNeedsMigration,
  compareVersions,
} from './versioning';

export type MigrationFunction = (oldData: unknown) => unknown;

/**
 * Migration registry
 */
const migrations: Record<string, MigrationFunction> = {};

/**
 * Register a migration function
 */
export function registerMigration(
  fromVersion: string,
  toVersion: string,
  migrationFn: MigrationFunction
): void {
  const key = `${fromVersion}->${toVersion}`;
  migrations[key] = migrationFn;
}

/**
 * Get migration path from one version to another
 */
function getMigrationPath(fromVersion: string, toVersion: string): string[] {
  const path: string[] = [];
  let current = fromVersion;

  // Simple linear migration path (can be enhanced for complex paths)
  while (compareVersions(current, toVersion) < 0) {
    // Find next version
    const nextVersion = findNextVersion(current);
    if (!nextVersion) break;

    path.push(`${current}->${nextVersion}`);
    current = nextVersion;
  }

  return path;
}

/**
 * Find next version after current
 */
function findNextVersion(current: string): string | null {
  // This is a simplified version - in reality, you'd have a version graph
  if (current === '1.0.0') return '2.0.0';
  return null;
}

/**
 * Migrate data from one version to another
 */
export function migrateData<T>(
  versionedData: VersionedData<T>,
  targetVersion: string = CURRENT_VERSION
): VersionedData<T> {
  const currentVersion = versionedData.version || '1.0.0';

  if (compareVersions(currentVersion, targetVersion) >= 0) {
    // Already at or past target version
    return versionedData;
  }

  const migrationPath = getMigrationPath(currentVersion, targetVersion);
  let migratedData: unknown = versionedData.data;

  for (const migrationKey of migrationPath) {
    const migrationFn = migrations[migrationKey];
    if (!migrationFn) {
      console.warn(`No migration found for ${migrationKey}, skipping`);
      continue;
    }

    try {
      migratedData = migrationFn(migratedData);
    } catch (error) {
      console.error(`Migration ${migrationKey} failed:`, error);
      throw new Error(`Migration failed: ${migrationKey}`);
    }
  }

  return {
    ...versionedData,
    version: targetVersion,
    data: migratedData as T,
    migratedAt: Date.now(),
  };
}

/**
 * Migration: 1.0.0 -> 2.0.0
 * Adds versioning and validates block parameters
 */
registerMigration('1.0.0', '2.0.0', (oldData: unknown) => {
  // Old data structure: just blocks array or strategy object
  if (Array.isArray(oldData)) {
    // It's a blocks array
    const blocks = oldData as LegoBlock[];

    // Validate and fix blocks
    const validatedBlocks = blocks.map((block) => {
      // Ensure all required fields exist
      const validated: LegoBlock = {
        id: block.id || crypto.randomUUID(),
        type: block.type || 'unknown',
        label: block.label || 'Unnamed Block',
        description: block.description || '',
        category: block.category,
        protocol: block.protocol,
        icon: block.icon || 'box',
        params: block.params || {},
      };

      // Try to validate params (will fix if possible)
      try {
        const parseResult = parseBlocks([validated]);
        if (parseResult.success && parseResult.data) {
          return parseResult.data[0] as LegoBlock;
        }
      } catch {
        // Keep original if validation fails
      }

      return validated;
    });

    return validatedBlocks;
  }

  if (oldData && typeof oldData === 'object' && 'blocks' in oldData) {
    // It's a strategy object
    const strategy = oldData as { blocks: LegoBlock[]; [key: string]: unknown };
    const validatedBlocks = (strategy.blocks || []).map((block) => {
      const validated: LegoBlock = {
        id: block.id || crypto.randomUUID(),
        type: block.type || 'unknown',
        label: block.label || 'Unnamed Block',
        description: block.description || '',
        category: block.category,
        protocol: block.protocol,
        icon: block.icon || 'box',
        params: block.params || {},
      };

      try {
        const parseResult = parseBlocks([validated]);
        if (parseResult.success && parseResult.data) {
          return parseResult.data[0] as LegoBlock;
        }
      } catch {
        // Keep original if validation fails
      }

      return validated;
    });

    return {
      ...strategy,
      blocks: validatedBlocks,
    };
  }

  // Unknown format, return as-is
  return oldData;
});

/**
 * Auto-migrate data on read
 */
export function autoMigrate<T>(data: unknown): T {
  // Check if it's already versioned
  if (data && typeof data === 'object' && 'version' in data) {
    const versioned = data as VersionedData<T>;
    if (needsMigration(versioned)) {
      return migrateData(versioned).data;
    }
    return versioned.data;
  }

  // Old unversioned data - wrap and migrate
  const versioned = {
    version: '1.0.0',
    data,
  } as VersionedData<T>;

  return migrateData(versioned).data;
}

/**
 * Check if data needs migration (re-export for convenience)
 */
export function needsMigration(data: unknown): boolean {
  return checkNeedsMigration(data);
}

// Re-export compareVersions
export { compareVersions } from './versioning';
