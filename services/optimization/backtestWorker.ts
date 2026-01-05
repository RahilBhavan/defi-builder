import { isRetryableError, retryWithBackoff } from '../../lib/error/retry';
import type { LegoBlock } from '../../types';
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
  private busyWorkers = new Set<number>(); // Track which worker indices are busy
  private cache = new Map<string, DeFiBacktestResult>();
  private cacheHits = 0;
  private cacheMisses = 0;
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
    const cacheKey = this.getCacheKey(parameters, config);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;

    return retryWithBackoff(
      () => {
        return new Promise<DeFiBacktestResult>((resolve, reject) => {
          const taskId = `task-${Date.now()}-${Math.random()}`;

          this.taskQueue.push({
            id: taskId,
            resolve: (result) => {
              // Only cache if it wasn't already cached
              if (!this.cache.has(cacheKey)) {
                this.cache.set(cacheKey, result);
              }
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

    // Find an available worker
    let availableWorkerIndex = -1;
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.busyWorkers.has(i)) {
        availableWorkerIndex = i;
        break;
      }
    }

    if (availableWorkerIndex === -1) {
      return; // No available workers
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    const worker = this.workers[availableWorkerIndex];
    if (!worker) return;

    const request: BacktestWorkerRequest = {
      type: 'BACKTEST',
      id: task.id,
      blocks,
      parameters,
      config,
    };

    worker.postMessage(request);
    this.busyWorkers.add(availableWorkerIndex);
    this.activeWorkers++;

    // Store worker index in task for later cleanup
    (task as BacktestTask & { workerIndex?: number }).workerIndex = availableWorkerIndex;
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

    const task = this.taskQueue[taskIndex] as BacktestTask & { workerIndex?: number };
    if (!task) return;

    // Mark worker as available
    if (task.workerIndex !== undefined) {
      this.busyWorkers.delete(task.workerIndex);
    }
    this.activeWorkers--;

    if (type === 'RESULT' && result) {
      task.resolve(result);
      // Remove task from queue
      this.taskQueue.splice(taskIndex, 1);
      // Process next task in queue
      this.processNextTask();
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
      this.processNextTask();
    }
  }

  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.activeWorkers < this.workerCount) {
      const nextTask = this.taskQueue[0];
      if (nextTask) {
        this.processQueue(nextTask.blocks, nextTask.parameters, nextTask.config);
      }
    }
  }

  private getCacheKey(
    parameters: ParameterSet,
    config: {
      startDate: Date;
      endDate: Date;
      initialCapital: number;
      rebalanceInterval: number;
    }
  ): string {
    // Include config in cache key to avoid collisions
    return JSON.stringify({
      parameters,
      startDate: config.startDate.toISOString(),
      endDate: config.endDate.toISOString(),
      initialCapital: config.initialCapital,
      rebalanceInterval: config.rebalanceInterval,
    });
  }

  getCacheStats(): { size: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  getActiveWorkerCount(): number {
    return this.activeWorkers;
  }

  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
    this.activeWorkers = 0;
    this.cache.clear();
  }
}
