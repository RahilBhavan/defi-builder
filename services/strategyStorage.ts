import { Strategy, LegoBlock } from '../types';

const STRATEGY_STORAGE_KEY = 'defi-builder-strategies';
const CURRENT_STRATEGY_KEY = 'defi-builder-current-strategy';

/**
 * Save a strategy to localStorage
 */
export function saveStrategy(strategy: Strategy): void {
  try {
    const strategies = getStrategies();
    const existingIndex = strategies.findIndex(s => s.id === strategy.id);
    
    if (existingIndex >= 0) {
      strategies[existingIndex] = strategy;
    } else {
      strategies.push(strategy);
    }
    
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies));
  } catch (error) {
    console.error('Error saving strategy:', error);
    throw new Error('Failed to save strategy');
  }
}

/**
 * Get all saved strategies
 */
export function getStrategies(): Strategy[] {
  try {
    const data = localStorage.getItem(STRATEGY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
  return strategies.find(s => s.id === id) || null;
}

/**
 * Delete a strategy
 */
export function deleteStrategy(id: string): void {
  try {
    const strategies = getStrategies().filter(s => s.id !== id);
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies));
  } catch (error) {
    console.error('Error deleting strategy:', error);
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
    console.error('Error importing strategy:', error);
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
    return blocks.map(block => ({
      ...block,
      id: crypto.randomUUID(),
    }));
  } catch (error) {
    console.error('Error importing blocks:', error);
    throw new Error('Failed to import blocks. Invalid JSON format.');
  }
}

