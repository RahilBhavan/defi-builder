/**
 * Storage utilities
 *
 * JSON handling, storage services, and data persistence utilities
 */

// JSON parsing utilities
export { safeJsonParse, safeJsonStringify, safeJsonParseWithSchema } from './json';

// Backup utilities
export {
  type BackupData,
  getStorageStats,
  createBackup,
  exportBackup,
  importBackup,
  restoreBackup,
  getCachedBackups,
  clearBackupCache,
  downloadBackup,
  loadBackupFromFile,
  autoBackup,
  clearAllData,
} from './services/backup';

// Migration utilities
export {
  type MigrationFunction,
  registerMigration,
  migrateData,
  autoMigrate,
} from './services/migrations';

// Versioning utilities (main source - use these)
export {
  CURRENT_VERSION,
  VERSION_HISTORY,
  type DataVersion,
  type VersionedData,
  type VersionMetadata,
  isValidVersion,
  compareVersions,
  needsMigration,
  getDataVersion,
  wrapWithVersion,
  unwrapVersionedData,
  createVersionMetadata,
  VERSION_METADATA_KEY,
  getVersionMetadata,
  saveVersionMetadata,
  updateVersionMetadata,
} from './services/versioning';
