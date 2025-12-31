/**
 * Backup and export system for localStorage data
 * Provides data backup, export, import, and recovery functionality
 */

import type { Strategy } from '../../types';
import type { LegoBlock } from '../../types';
import { CURRENT_VERSION, VersionedData, wrapWithVersion } from './versioning';

/**
 * Backup data structure
 */
export interface BackupData {
  version: string;
  timestamp: number;
  strategies: Strategy[];
  blocks: LegoBlock[];
  metadata: {
    itemCount: number;
    totalSize: number;
    description?: string;
  };
}

/**
 * Storage keys to backup
 */
const BACKUP_KEYS = [
  'defi-builder-strategies',
  'defi-builder-blocks',
  'defi-builder-current-strategy',
] as const;

/**
 * In-memory backup cache (last 5 backups)
 */
const BACKUP_CACHE: BackupData[] = [];
const MAX_CACHE_SIZE = 5;

/**
 * Get all data from localStorage
 */
function getAllStorageData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('defi-builder-')) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return data;
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  itemCount: number;
  totalSize: number;
  keys: string[];
} {
  let totalSize = 0;
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('defi-builder-')) {
      keys.push(key);
      const value = localStorage.getItem(key) || '';
      totalSize += key.length + value.length;
    }
  }

  return {
    itemCount: keys.length,
    totalSize,
    keys,
  };
}

/**
 * Create a backup of all data
 */
export function createBackup(description?: string): BackupData {
  const stats = getStorageStats();
  const data = getAllStorageData();

  const backup: BackupData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    strategies: (data['defi-builder-strategies'] as Strategy[]) || [],
    blocks: (data['defi-builder-blocks'] as LegoBlock[]) || [],
    metadata: {
      itemCount: stats.itemCount,
      totalSize: stats.totalSize,
      description,
    },
  };

  // Add to cache
  BACKUP_CACHE.push(backup);
  if (BACKUP_CACHE.length > MAX_CACHE_SIZE) {
    BACKUP_CACHE.shift(); // Remove oldest
  }

  return backup;
}

/**
 * Export backup to JSON string
 */
export function exportBackup(backup: BackupData): string {
  return JSON.stringify(backup, null, 2);
}

/**
 * Import backup from JSON string
 */
export function importBackup(json: string): BackupData {
  try {
    const backup = JSON.parse(json) as BackupData;

    // Validate backup structure
    if (!backup.version || !backup.timestamp) {
      throw new Error('Invalid backup format: missing version or timestamp');
    }

    if (!Array.isArray(backup.strategies) || !Array.isArray(backup.blocks)) {
      throw new Error('Invalid backup format: missing strategies or blocks');
    }

    return backup;
  } catch (error) {
    throw new Error(
      `Failed to import backup: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }
}

/**
 * Restore backup to localStorage
 */
export function restoreBackup(
  backup: BackupData,
  overwrite = false
): {
  success: boolean;
  restored: string[];
  errors: string[];
} {
  const restored: string[] = [];
  const errors: string[] = [];

  try {
    // Check if data exists and overwrite is false
    if (!overwrite) {
      const existing = getStorageStats();
      if (existing.itemCount > 0) {
        throw new Error('Storage is not empty. Use overwrite=true to replace existing data.');
      }
    }

    // Restore strategies
    if (backup.strategies.length > 0) {
      try {
        localStorage.setItem('defi-builder-strategies', JSON.stringify(backup.strategies));
        restored.push('defi-builder-strategies');
      } catch (error) {
        errors.push(
          `Failed to restore strategies: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Restore blocks
    if (backup.blocks.length > 0) {
      try {
        localStorage.setItem('defi-builder-blocks', JSON.stringify(backup.blocks));
        restored.push('defi-builder-blocks');
      } catch (error) {
        errors.push(
          `Failed to restore blocks: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      restored,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      restored,
      errors: [error instanceof Error ? error.message : 'Restore failed'],
    };
  }
}

/**
 * Get cached backups
 */
export function getCachedBackups(): BackupData[] {
  return [...BACKUP_CACHE];
}

/**
 * Clear backup cache
 */
export function clearBackupCache(): void {
  BACKUP_CACHE.length = 0;
}

/**
 * Download backup as file
 */
export function downloadBackup(backup: BackupData, filename?: string): void {
  const json = exportBackup(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `defi-builder-backup-${new Date(backup.timestamp).toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load backup from file
 */
export function loadBackupFromFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const backup = importBackup(json);
        resolve(backup);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Auto-backup before destructive operations
 */
export function autoBackup(): BackupData {
  return createBackup('Auto-backup before operation');
}

/**
 * Clear all localStorage data (with backup)
 */
export function clearAllData(createBackupFirst = true): {
  success: boolean;
  backup?: BackupData;
  error?: string;
} {
  try {
    let backup: BackupData | undefined;

    if (createBackupFirst) {
      backup = autoBackup();
    }

    // Clear all defi-builder keys
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('defi-builder-')) {
        keys.push(key);
      }
    }

    keys.forEach((key) => localStorage.removeItem(key));

    return {
      success: true,
      backup,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear data',
    };
  }
}
