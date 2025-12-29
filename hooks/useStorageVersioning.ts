/**
 * Hook for managing storage versioning
 * Automatically handles version detection and migration
 */

import { useEffect, useState } from 'react';
import {
  VersionedData,
  wrapWithVersion,
  unwrapVersionedData,
  needsMigration,
  getDataVersion,
  CURRENT_VERSION,
  updateVersionMetadata,
} from '../services/storage/versioning';
import { migrateData } from '../services/storage/migrations';

/**
 * Options for versioned storage
 */
export interface VersionedStorageOptions {
  autoMigrate?: boolean;
  onMigration?: (fromVersion: string, toVersion: string) => void;
}

/**
 * Hook for versioned localStorage
 */
export function useVersionedStorage<T>(
  key: string,
  initialValue: T,
  options: VersionedStorageOptions = {}
): [T, (value: T) => void, () => void, { version: string | null; migrated: boolean }] {
  const { autoMigrate: shouldAutoMigrate = true, onMigration } = options;
  const [migrated, setMigrated] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  // Initialize and migrate on mount
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item) as unknown;

      // Check if it's versioned
      if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        const versioned = parsed as VersionedData<T>;
        setVersion(versioned.version);

        if (shouldAutoMigrate && needsMigration(versioned)) {
          const migrated = migrateData(versioned);
          if (migrated.version !== versioned.version) {
            onMigration?.(versioned.version, migrated.version);
            updateVersionMetadata(migrated.version);
            setMigrated(true);
            setVersion(migrated.version);
            // Save migrated data
            window.localStorage.setItem(key, JSON.stringify(migrated));
            return migrated.data;
          }
          return versioned.data;
        }

        return versioned.data;
      }

      // Old unversioned data - migrate it
      if (shouldAutoMigrate) {
        const versioned = wrapWithVersion(parsed as T, '1.0.0');
        const migrated = migrateData(versioned);
        onMigration?.('1.0.0', migrated.version);
        updateVersionMetadata(migrated.version);
        setMigrated(true);
        setVersion(migrated.version);
        window.localStorage.setItem(key, JSON.stringify(migrated));
        return migrated.data;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Error reading versioned storage key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter that wraps with version
  const setVersionedValue = (newValue: T) => {
    try {
      const versioned = wrapWithVersion(newValue, CURRENT_VERSION);
      setValue(newValue);
      setVersion(CURRENT_VERSION);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(versioned));
      }
    } catch (error) {
      console.error(`Error setting versioned storage key "${key}":`, error);
    }
  };

  // Remover
  const removeValue = () => {
    try {
      setValue(initialValue);
      setVersion(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing versioned storage key "${key}":`, error);
    }
  };

  return [value, setVersionedValue, removeValue, { version, migrated }];
}

