import type { LegoBlock } from '../../types';
import type { DeFiBacktestResult } from '../defiBacktestEngine';

// Parameter definitions
export interface ParameterDefinition {
  blockId: string;
  blockType: string;
  paramName: string;
  type: 'continuous' | 'discrete' | 'percentage';
  min?: number;
  max?: number;
  values?: number[]; // For discrete parameters
  defaultValue: number;
}

export interface ParameterSet {
  [blockId: string]: {
    [paramName: string]: number;
  };
}

// Optimization configuration
export type OptimizationAlgorithm = 'bayesian' | 'genetic';

export type OptimizationObjective =
  | 'sharpeRatio'
  | 'totalReturn'
  | 'maxDrawdown'
  | 'winRate'
  | 'gasCosts'
  | 'protocolFees';

export interface OptimizationConfig {
  algorithm: OptimizationAlgorithm;
  objectives: OptimizationObjective[]; // At least 2
  maxIterations: number;
  parameters: ParameterDefinition[];
  backtestConfig: {
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    rebalanceInterval: number;
  };
}

// Walk-forward validation
export interface WalkForwardWindow {
  trainStart: Date;
  trainEnd: Date;
  testStart: Date;
  testEnd: Date;
}

// Optimization results
export interface ObjectiveScores {
  sharpeRatio?: number;
  totalReturn?: number;
  maxDrawdown?: number;
  winRate?: number;
  gasCosts?: number;
  protocolFees?: number;
}

export interface OptimizationSolution {
  id: string;
  parameters: ParameterSet;
  inSampleScores: ObjectiveScores;
  outOfSampleScores: ObjectiveScores;
  degradation: number; // Percentage
  isParetoOptimal: boolean;
  backtestResult?: DeFiBacktestResult;
}

export interface OptimizationProgress {
  iteration: number;
  maxIterations: number;
  bestSolution?: OptimizationSolution;
  paretoFrontier: OptimizationSolution[];
  estimatedTimeRemaining: number; // seconds
  workersActive: number;
  errors?: string[];
  lastError?: string;
}

export interface OptimizationResult {
  config: OptimizationConfig;
  solutions: OptimizationSolution[];
  paretoFrontier: OptimizationSolution[];
  totalIterations: number;
  totalTime: number; // seconds
  cacheHitRate: number;
}

// Web Worker messages
export interface BacktestWorkerRequest {
  type: 'BACKTEST';
  id: string;
  blocks: LegoBlock[];
  parameters: ParameterSet;
  config: {
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    rebalanceInterval: number;
  };
}

export interface BacktestWorkerResponse {
  type: 'RESULT' | 'ERROR';
  id: string;
  parameters: ParameterSet;
  result?: DeFiBacktestResult;
  error?: string;
}
