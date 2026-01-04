/**
 * Unit tests for Paper Trading Storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paperTradingStorage } from '../paperTradingStorage';
import type { PaperTradingSession } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PaperTradingStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('save and load', () => {
    it('should save and load sessions', () => {
      const mockSession: PaperTradingSession = {
        id: 'test-session-1',
        config: {
          blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
          initialCapital: 10000,
          rebalanceInterval: 86400000,
          startDate: new Date('2024-01-01'),
        },
        status: 'stopped',
        startTime: new Date('2024-01-01'),
        results: {
          sessionId: 'test-session-1',
          isLive: false,
          lastUpdateTime: new Date('2024-01-01'),
          metrics: {
            sharpeRatio: 1.5,
            totalReturn: 0.1,
            maxDrawdown: 0.05,
            winTrades: 10,
            totalTrades: 20,
            totalGasSpent: 100,
            totalFeesSpent: 50,
          },
          equityCurve: [{ date: '2024-01-01T00:00:00.000Z', equity: 10000 }],
          trades: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          initialCapital: 10000,
        },
      };

      paperTradingStorage.save([mockSession]);
      const loaded = paperTradingStorage.load();

      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe(mockSession.id);
      expect(loaded[0]?.config.initialCapital).toBe(10000);
    });

    it('should handle empty storage', () => {
      const loaded = paperTradingStorage.load();
      expect(loaded).toEqual([]);
    });
  });

  describe('removeSession', () => {
    it('should remove a specific session', () => {
      const mockSession1: PaperTradingSession = {
        id: 'session-1',
        config: {
          blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
          initialCapital: 10000,
          rebalanceInterval: 86400000,
          startDate: new Date(),
        },
        status: 'stopped',
        startTime: new Date(),
        results: {
          sessionId: 'session-1',
          isLive: false,
          lastUpdateTime: new Date(),
          metrics: {
            sharpeRatio: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            winTrades: 0,
            totalTrades: 0,
            totalGasSpent: 0,
            totalFeesSpent: 0,
          },
          equityCurve: [],
          trades: [],
          startDate: new Date(),
          endDate: new Date(),
          initialCapital: 10000,
        },
      };

      const mockSession2: PaperTradingSession = {
        ...mockSession1,
        id: 'session-2',
        results: { ...mockSession1.results, sessionId: 'session-2' },
      };

      paperTradingStorage.save([mockSession1, mockSession2]);
      paperTradingStorage.removeSession('session-1');

      const loaded = paperTradingStorage.load();
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe('session-2');
    });
  });

  describe('clear', () => {
    it('should clear all stored sessions', () => {
      const mockSession: PaperTradingSession = {
        id: 'test-session',
        config: {
          blocks: [{ id: 'block-1', type: 'ENTRY', params: {} }],
          initialCapital: 10000,
          rebalanceInterval: 86400000,
          startDate: new Date(),
        },
        status: 'stopped',
        startTime: new Date(),
        results: {
          sessionId: 'test-session',
          isLive: false,
          lastUpdateTime: new Date(),
          metrics: {
            sharpeRatio: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            winTrades: 0,
            totalTrades: 0,
            totalGasSpent: 0,
            totalFeesSpent: 0,
          },
          equityCurve: [],
          trades: [],
          startDate: new Date(),
          endDate: new Date(),
          initialCapital: 10000,
        },
      };

      paperTradingStorage.save([mockSession]);
      paperTradingStorage.clear();

      const loaded = paperTradingStorage.load();
      expect(loaded).toEqual([]);
    });
  });
});

