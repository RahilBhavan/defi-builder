/**
 * Unit tests for Paper Trading Engine
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paperTradingEngine } from '../paperTradingEngine';
import type { PaperTradingConfig } from '../types';

// Mock dependencies
vi.mock('../priceFeed', () => ({
  priceFeedService: {
    subscribe: vi.fn(() => () => {}),
    getPrice: vi.fn((token: string) => {
      const prices: Record<string, number> = {
        ETH: 2500,
        USDC: 1.0,
        DAI: 1.0,
        WBTC: 45000,
      };
      return prices[token];
    }),
    getAllPrices: vi.fn(
      () =>
        new Map([
          ['ETH', 2500],
          ['USDC', 1.0],
        ])
    ),
  },
}));

vi.mock('../backtest/blockExecutor', () => ({
  executeBlockSequence: vi.fn(() => []),
}));

describe('PaperTradingEngine', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    const sessions = paperTradingEngine.getAllSessions();
    for (const session of sessions) {
      paperTradingEngine.deleteSession(session.id);
    }
  });

  describe('createSession', () => {
    it('should create a new paper trading session', () => {
      const config: PaperTradingConfig = {
        blocks: [
          {
            id: 'block-1',
            type: 'ENTRY',
            params: { inputToken: 'USDC', outputToken: 'ETH' },
          },
        ],
        initialCapital: 10000,
        rebalanceInterval: 86400000, // 1 day
        startDate: new Date(),
        strategyName: 'Test Strategy',
      };

      const session = paperTradingEngine.createSession(config);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.config).toEqual(config);
      expect(session.status).toBe('stopped');
      expect(session.results.initialCapital).toBe(10000);
    });

    it('should generate unique session IDs', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session1 = paperTradingEngine.createSession(config);
      const session2 = paperTradingEngine.createSession(config);

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getSession', () => {
    it('should retrieve a session by ID', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session = paperTradingEngine.createSession(config);
      const retrieved = paperTradingEngine.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = paperTradingEngine.getSession('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('startSession', () => {
    it('should start a stopped session', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session = paperTradingEngine.createSession(config);
      paperTradingEngine.startSession(session.id);

      const updated = paperTradingEngine.getSession(session.id);
      expect(updated?.status).toBe('running');
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        paperTradingEngine.startSession('non-existent-id');
      }).toThrow('Session non-existent-id not found');
    });
  });

  describe('pauseSession', () => {
    it('should pause a running session', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session = paperTradingEngine.createSession(config);
      paperTradingEngine.startSession(session.id);
      paperTradingEngine.pauseSession(session.id);

      const updated = paperTradingEngine.getSession(session.id);
      expect(updated?.status).toBe('paused');
    });
  });

  describe('stopSession', () => {
    it('should stop a running session', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session = paperTradingEngine.createSession(config);
      paperTradingEngine.startSession(session.id);
      paperTradingEngine.stopSession(session.id);

      const updated = paperTradingEngine.getSession(session.id);
      expect(updated?.status).toBe('stopped');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session = paperTradingEngine.createSession(config);
      paperTradingEngine.deleteSession(session.id);

      const retrieved = paperTradingEngine.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions', () => {
      const config: PaperTradingConfig = {
        blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
        initialCapital: 10000,
        rebalanceInterval: 86400000,
        startDate: new Date(),
      };

      const session1 = paperTradingEngine.createSession(config);
      const session2 = paperTradingEngine.createSession(config);

      const allSessions = paperTradingEngine.getAllSessions();
      expect(allSessions.length).toBeGreaterThanOrEqual(2);
      expect(allSessions.some((s) => s.id === session1.id)).toBe(true);
      expect(allSessions.some((s) => s.id === session2.id)).toBe(true);
    });
  });
});
