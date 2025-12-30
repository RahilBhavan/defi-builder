import type { LegoBlock, Strategy } from '../types';
import { logger } from '../utils/logger';
import { autoBackup } from './storage/backup';
import { CURRENT_VERSION, type VersionedData, wrapWithVersion } from './storage/versioning';

const STRATEGY_STORAGE_KEY = 'defi-builder-strategies';
const CURRENT_STRATEGY_KEY = 'defi-builder-current-strategy';

/**
 * Save a strategy to localStorage with versioning and auto-backup
 */
export function saveStrategy(strategy: Strategy, createBackup = true): void {
  try {
    // Auto-backup before save
    if (createBackup) {
      autoBackup();
    }

    const strategies = getStrategies();
    const existingIndex = strategies.findIndex((s) => s.id === strategy.id);

    if (existingIndex >= 0) {
      strategies[existingIndex] = strategy;
    } else {
      strategies.push(strategy);
    }

    // Save with versioning
    const versioned = wrapWithVersion(strategies, CURRENT_VERSION);
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(versioned));
  } catch (error) {
    logger.error('Error saving strategy', error instanceof Error ? error : new Error(String(error)), 'StrategyStorage');
    throw new Error('Failed to save strategy. Please try again.');
  }
}

/**
 * Get all saved strategies with versioning support
 */
export function getStrategies(): Strategy[] {
  try {
    const data = localStorage.getItem(STRATEGY_STORAGE_KEY);
    if (!data) return [];

    const parsed = safeJsonParse<VersionedData<Strategy[]> | Strategy[]>(data);

    // Check if versioned
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      const versioned = parsed as VersionedData<Strategy[]>;
      return versioned.data;
    }

    // Old unversioned data
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading strategies:', error);
    return [];
  }
}

/**
 * Get a strategy by ID
 */
export function getStrategy(id: string): Strategy | null {
  const strategies = getStrategies();
  return strategies.find((s) => s.id === id) || null;
}

/**
 * Delete a strategy with auto-backup
 */
export function deleteStrategy(id: string, createBackup = true): void {
  try {
    // Auto-backup before delete
    if (createBackup) {
      autoBackup();
    }

    const strategies = getStrategies().filter((s) => s.id !== id);
    const versioned = wrapWithVersion(strategies, CURRENT_VERSION);
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(versioned));
  } catch (error) {
    logger.error('Error deleting strategy', error instanceof Error ? error : new Error(String(error)), 'StrategyStorage');
    throw new Error('Failed to delete strategy');
  }
}

/**
 * Export strategy as JSON string
 */
export function exportStrategy(strategy: Strategy): string {
  return JSON.stringify(strategy, null, 2);
}

/**
 * Import strategy from JSON string
 */
export function importStrategy(json: string): Strategy {
  try {
    const strategy = JSON.parse(json) as Strategy;

    // Validate structure
    if (!strategy.id || !strategy.name || !Array.isArray(strategy.blocks)) {
      throw new Error('Invalid strategy format');
    }

    // Generate new ID and timestamp
    strategy.id = crypto.randomUUID();
    strategy.createdAt = Date.now();

    return strategy;
  } catch (error) {
    logger.error('Error importing strategy', error instanceof Error ? error : new Error(String(error)), 'StrategyStorage');
    throw new Error('Failed to import strategy. Invalid JSON format.');
  }
}

/**
 * Create a strategy from blocks
 */
export function createStrategyFromBlocks(blocks: LegoBlock[], name: string): Strategy {
  return {
    id: crypto.randomUUID(),
    name,
    blocks,
    createdAt: Date.now(),
  };
}

/**
 * Export blocks as JSON
 */
export function exportBlocks(blocks: LegoBlock[]): string {
  return JSON.stringify(blocks, null, 2);
}

/**
 * Import blocks from JSON
 */
export function importBlocks(json: string): LegoBlock[] {
  try {
    const blocks = JSON.parse(json) as LegoBlock[];

    if (!Array.isArray(blocks)) {
      throw new Error('Invalid blocks format');
    }

    // Validate and regenerate IDs
    return blocks.map((block) => ({
      ...block,
      id: crypto.randomUUID(),
    }));
  } catch (error) {
    logger.error('Error importing blocks', error instanceof Error ? error : new Error(String(error)), 'StrategyStorage');
    throw new Error('Failed to import blocks. Invalid JSON format.');
  }
}
