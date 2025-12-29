/**
 * Data versioning system for localStorage
 * Handles version detection, migration, and schema evolution
 */

export const CURRENT_VERSION = '2.0.0';
export const VERSION_HISTORY = ['1.0.0', '2.0.0'] as const;

export type DataVersion = (typeof VERSION_HISTORY)[number];

/**
 * Versioned data structure
 */
export interface VersionedData<T = unknown> {
  version: string;
  data: T;
  migratedAt?: number;
  createdAt?: number;
}

/**
 * Version metadata
 */
export interface VersionMetadata {
  version: string;
  timestamp: number;
  migrationCount: number;
}

/**
 * Check if a version is valid
 */
export function isValidVersion(version: string): version is DataVersion {
  return VERSION_HISTORY.includes(version as DataVersion);
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Check if data needs migration
 */
export function needsMigration(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const versioned = data as Partial<VersionedData>;
  if (!versioned.version) {
    return true; // Old data without version
  }

  return compareVersions(versioned.version, CURRENT_VERSION) < 0;
}

/**
 * Get version from data
 */
export function getDataVersion(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const versioned = data as Partial<VersionedData>;
  return versioned.version || null;
}

/**
 * Wrap data with version
 */
export function wrapWithVersion<T>(data: T, version: string = CURRENT_VERSION): VersionedData<T> {
  return {
    version,
    data,
    createdAt: Date.now(),
  };
}

/**
 * Unwrap versioned data
 */
export function unwrapVersionedData<T>(versioned: VersionedData<T>): T {
  return versioned.data;
}

/**
 * Create version metadata
 */
export function createVersionMetadata(version: string, migrationCount = 0): VersionMetadata {
  return {
    version,
    timestamp: Date.now(),
    migrationCount,
  };
}

/**
 * Storage key for version metadata
 */
export const VERSION_METADATA_KEY = 'defi-builder-version-metadata';

/**
 * Get stored version metadata
 */
export function getVersionMetadata(): VersionMetadata | null {
  try {
    const stored = localStorage.getItem(VERSION_METADATA_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as VersionMetadata;
  } catch {
    return null;
  }
}

/**
 * Save version metadata
 */
export function saveVersionMetadata(metadata: VersionMetadata): void {
  try {
    localStorage.setItem(VERSION_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save version metadata:', error);
  }
}

/**
 * Update version metadata after migration
 */
export function updateVersionMetadata(version: string): void {
  const existing = getVersionMetadata();
  const metadata = createVersionMetadata(version, existing ? existing.migrationCount + 1 : 1);
  saveVersionMetadata(metadata);
}
