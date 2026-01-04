/**
 * Paper Trading Storage Service
 * Handles persistence of paper trading sessions to localStorage
 */

import { logger } from '../../lib/monitoring/logger';
import type { PaperTradingSession, StoredPaperTradingData } from './types';

const STORAGE_KEY = 'defi-builder-paper-trading';
const STORAGE_VERSION = '1.0.0';

export class PaperTradingStorage {
  /**
   * Save sessions to localStorage
   */
  save(sessions: PaperTradingSession[]): void {
    try {
      const data: StoredPaperTradingData = {
        sessions: sessions.map((session) => ({
          ...session,
          // Convert Dates to ISO strings for storage
          startTime: session.startTime,
          lastExecutionTime: session.lastExecutionTime,
          nextExecutionTime: session.nextExecutionTime,
          config: {
            ...session.config,
            startDate: session.config.startDate,
          },
          results: {
            ...session.results,
            startDate: session.results.startDate,
            endDate: session.results.endDate,
            lastUpdateTime: session.results.lastUpdateTime,
          },
        })),
        lastUpdate: Date.now(),
        version: STORAGE_VERSION,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger.error(
          'localStorage quota exceeded. Consider removing old sessions.',
          error,
          'PaperTradingStorage'
        );
        // Try to save with fewer sessions
        if (sessions.length > 0) {
          const recentSessions = sessions.slice(-10); // Keep only last 10
          this.save(recentSessions);
        }
      } else {
        logger.error(
          'Error saving paper trading sessions',
          error instanceof Error ? error : new Error(String(error)),
          'PaperTradingStorage'
        );
      }
    }
  }

  /**
   * Load sessions from localStorage
   */
  load(): PaperTradingSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const data = JSON.parse(stored) as StoredPaperTradingData;

      // Validate version
      if (data.version !== STORAGE_VERSION) {
        logger.warn(
          `Paper trading storage version mismatch. Expected ${STORAGE_VERSION}, got ${data.version}. Migrating...`,
          undefined,
          'PaperTradingStorage'
        );
        // Future: Add migration logic here
      }

      // Convert ISO strings back to Dates
      return (data.sessions || []).map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        lastExecutionTime: session.lastExecutionTime ? new Date(session.lastExecutionTime) : undefined,
        nextExecutionTime: session.nextExecutionTime ? new Date(session.nextExecutionTime) : undefined,
        config: {
          ...session.config,
          startDate: new Date(session.config.startDate),
        },
        results: {
          ...session.results,
          startDate: new Date(session.results.startDate),
          endDate: new Date(session.results.endDate),
          lastUpdateTime: new Date(session.results.lastUpdateTime),
        },
      }));
    } catch (error) {
      logger.error(
        'Error loading paper trading sessions',
        error instanceof Error ? error : new Error(String(error)),
        'PaperTradingStorage'
      );
      return [];
    }
  }

  /**
   * Clear all stored sessions
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error(
        'Error clearing paper trading storage',
        error instanceof Error ? error : new Error(String(error)),
        'PaperTradingStorage'
      );
    }
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId: string): void {
    const sessions = this.load();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    this.save(filtered);
  }
}

// Singleton instance
export const paperTradingStorage = new PaperTradingStorage();

