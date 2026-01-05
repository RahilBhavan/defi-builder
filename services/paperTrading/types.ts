/**
 * Type definitions for paper trading feature
 */

import type { LegoBlock } from '../../types';
import type { DeFiBacktestResult } from '../defiBacktestEngine';

export interface PaperTradingConfig {
  blocks: LegoBlock[];
  initialCapital: number;
  rebalanceInterval: number; // in milliseconds
  startDate: Date;
  strategyId?: string;
  strategyName?: string;
}

export interface PaperTradingResult extends DeFiBacktestResult {
  sessionId: string;
  isLive: boolean;
  lastUpdateTime: Date;
}

export interface PaperTradingSession {
  id: string;
  config: PaperTradingConfig;
  status: 'running' | 'paused' | 'stopped';
  startTime: Date;
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
  results: PaperTradingResult;
}

export interface StoredPaperTradingData {
  sessions: PaperTradingSession[];
  lastUpdate: number;
  version: string;
}

export type PaperTradingStatusUpdate = {
  sessionId: string;
  status: PaperTradingSession['status'];
  equity: number;
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
};

export type PaperTradingStatusCallback = (update: PaperTradingStatusUpdate) => void;
