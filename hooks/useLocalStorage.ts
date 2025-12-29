import { useState, useCallback } from 'react';
import { wrapWithVersion, unwrapVersionedData, VersionedData } from '../services/storage/versioning';
import { migrateData } from '../services/storage/migrations';
import { CURRENT_VERSION } from '../services/storage/versioning';

/**
 * Custom hook for localStorage with type safety and versioning
 * @param key - localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @param useVersioning - Whether to use versioning (default: true for defi-builder keys)
 * @returns Tuple of [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  useVersioning: boolean = key.startsWith('defi-builder-')
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item) as unknown;

      if (useVersioning && parsed && typeof parsed === 'object' && 'version' in parsed) {
        // Versioned data - check if migration needed
        const versioned = parsed as VersionedData<T>;
        if (versioned.version !== CURRENT_VERSION) {
          // Migrate if needed
          const migrated = migrateData(versioned);
          // Save migrated version
          window.localStorage.setItem(key, JSON.stringify(migrated));
          return migrated.data;
        }
        return versioned.data;
      }

      // Non-versioned or old data
      if (useVersioning && parsed && typeof parsed === 'object') {
        // Old unversioned data - wrap and migrate
        const versioned = wrapWithVersion(parsed as T, '1.0.0');
        const migrated = migrateData(versioned);
        window.localStorage.setItem(key, JSON.stringify(migrated));
        return migrated.data;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          if (useVersioning) {
            const versioned = wrapWithVersion(valueToStore, CURRENT_VERSION);
            window.localStorage.setItem(key, JSON.stringify(versioned));
          } else {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, useVersioning]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

