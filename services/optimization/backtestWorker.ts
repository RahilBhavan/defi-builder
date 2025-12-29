import type { LegoBlock } from '../../types';
import { isRetryableError, retryWithBackoff } from '../../utils/retry';
import type { DeFiBacktestResult } from '../defiBacktestEngine';
import type { BacktestWorkerRequest, BacktestWorkerResponse, ParameterSet } from './types';

interface BacktestTask {
  id: string;
  resolve: (result: DeFiBacktestResult) => void;
  reject: (error: Error) => void;
  retries: number;
  blocks: LegoBlock[];
  parameters: ParameterSet;
  config: {
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    rebalanceInterval: number;
  };
}

export interface WorkerErrorInfo {
  type: 'timeout' | 'validation' | 'calculation' | 'network' | 'unknown';
  message: string;
  actionable?: string;
  parameters?: ParameterSet;
}

export class BacktestWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: BacktestTask[] = [];
  private activeWorkers = 0;
  private cache = new Map<string, DeFiBacktestResult>();
  private onError?: (error: WorkerErrorInfo) => void;

  constructor(
    private workerCount: number = Math.min(navigator.hardwareConcurrency || 4, 8),
    onError?: (error: WorkerErrorInfo) => void
  ) {
    this.onError = onError;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL('./optimization.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = this.handleWorkerMessage.bind(this);
      this.workers.push(worker);
    }
  }

  async runBacktest(
    blocks: LegoBlock[],
    parameters: ParameterSet,
    config: {
      startDate: Date;
      endDate: Date;
      initialCapital: number;
      rebalanceInterval: number;
    }
  ): Promise<DeFiBacktestResult> {
    const cacheKey = this.getCacheKey(parameters);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return retryWithBackoff(
      () => {
        return new Promise<DeFiBacktestResult>((resolve, reject) => {
          const taskId = `task-${Date.now()}-${Math.random()}`;

          this.taskQueue.push({
            id: taskId,
            resolve: (result) => {
              this.cache.set(cacheKey, result);
              resolve(result);
            },
            reject,
            retries: 0,
            blocks,
            parameters,
            config,
          });

          this.processQueue(blocks, parameters, config);
        });
      },
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        retryable: (error) => {
          // Don't retry validation errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (
              message.includes('validation') ||
              message.includes('invalid') ||
              message.includes('missing')
            ) {
              return false;
            }
          }
          return isRetryableError(error);
        },
      }
    );
  }

  private processQueue(
    blocks: LegoBlock[],
    parameters: ParameterSet,
    config: {
      startDate: Date;
      endDate: Date;
      initialCapital: number;
      rebalanceInterval: number;
    }
  ): void {
    if (this.taskQueue.length === 0 || this.activeWorkers >= this.workerCount) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    const worker = this.workers[this.activeWorkers];
    if (!worker) return;

    const request: BacktestWorkerRequest = {
      type: 'BACKTEST',
      id: task.id,
      blocks,
      parameters,
      config,
    };

    worker.postMessage(request);
    this.activeWorkers++;
  }

  private parseWorkerError(error: string, parameters?: ParameterSet): WorkerErrorInfo {
    const lowerError = error.toLowerCase();
    let type: WorkerErrorInfo['type'] = 'unknown';
    let actionable: string | undefined;

    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      type = 'timeout';
      actionable =
        'The backtest is taking too long. Try reducing the date range or simplifying your strategy.';
    } else if (
      lowerError.includes('validation') ||
      lowerError.includes('invalid') ||
      lowerError.includes('missing')
    ) {
      type = 'validation';
      actionable =
        'Check your strategy configuration. Ensure all required parameters are set correctly.';
    } else if (
      lowerError.includes('calculation') ||
      lowerError.includes('nan') ||
      lowerError.includes('infinity')
    ) {
      type = 'calculation';
      actionable =
        'A calculation error occurred. Check your strategy parameters for invalid values (e.g., negative amounts, zero divisions).';
    } else if (
      lowerError.includes('network') ||
      lowerError.includes('fetch') ||
      lowerError.includes('connection')
    ) {
      type = 'network';
      actionable =
        'Network error occurred while fetching price data. Check your internet connection and try again.';
    }

    return {
      type,
      message: error,
      actionable,
      parameters,
    };
  }

  private handleWorkerMessage(event: MessageEvent<BacktestWorkerResponse>): void {
    const { type, id, result, error, parameters } = event.data;

    const taskIndex = this.taskQueue.findIndex((t) => t.id === id);
    if (taskIndex === -1) return;

    const task = this.taskQueue[taskIndex];
    if (!task) return;

    this.activeWorkers--;

    if (type === 'RESULT' && result) {
      task.resolve(result);
      // Remove task from queue
      this.taskQueue.splice(taskIndex, 1);
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue[0];
        if (nextTask) {
          this.processQueue(nextTask.blocks, nextTask.parameters, nextTask.config);
        }
      }
    } else if (type === 'ERROR') {
      const errorInfo = this.parseWorkerError(
        error || 'Unknown worker error',
        parameters || task.parameters
      );

      // Surface error through callback if provided
      if (this.onError) {
        this.onError(errorInfo);
      }

      // Create enhanced error message
      const errorMessage = errorInfo.actionable
        ? `${errorInfo.message}. ${errorInfo.actionable}`
        : errorInfo.message;

      const enhancedError = new Error(errorMessage);
      enhancedError.name = `Worker${errorInfo.type.charAt(0).toUpperCase() + errorInfo.type.slice(1)}Error`;

      task.reject(enhancedError);
      // Remove task from queue
      this.taskQueue.splice(taskIndex, 1);

      // Process next task even after error
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue[0];
        if (nextTask) {
          this.processQueue(nextTask.blocks, nextTask.parameters, nextTask.config);
        }
      }
    }
  }

  private getCacheKey(parameters: ParameterSet): string {
    return JSON.stringify(parameters);
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0,
    };
  }

  getActiveWorkerCount(): number {
    return this.activeWorkers;
  }

  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.cache.clear();
  }
}
