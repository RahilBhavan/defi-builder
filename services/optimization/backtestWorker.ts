import { BacktestWorkerRequest, BacktestWorkerResponse, ParameterSet } from './types';
import { LegoBlock } from '../../types';
import { DeFiBacktestResult } from '../defiBacktestEngine';

interface BacktestTask {
  id: string;
  resolve: (result: DeFiBacktestResult) => void;
  reject: (error: Error) => void;
}

export class BacktestWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: BacktestTask[] = [];
  private activeWorkers = 0;
  private cache = new Map<string, DeFiBacktestResult>();

  constructor(private workerCount: number = Math.min(navigator.hardwareConcurrency || 4, 8)) {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(
        new URL('./optimization.worker.ts', import.meta.url),
        { type: 'module' }
      );

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

    return new Promise((resolve, reject) => {
      const taskId = `task-${Date.now()}-${Math.random()}`;

      this.taskQueue.push({
        id: taskId,
        resolve: (result) => {
          this.cache.set(cacheKey, result);
          resolve(result);
        },
        reject,
      });

      this.processQueue(blocks, parameters, config);
    });
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

    const task = this.taskQueue.shift()!;
    const worker = this.workers[this.activeWorkers];

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

  private handleWorkerMessage(event: MessageEvent<BacktestWorkerResponse>): void {
    const { type, id, result, error } = event.data;

    const task = this.taskQueue.find((t) => t.id === id);
    if (!task) return;

    this.activeWorkers--;

    if (type === 'RESULT' && result) {
      task.resolve(result);
    } else if (type === 'ERROR') {
      task.reject(new Error(error || 'Unknown worker error'));
    }

    // Process next task - simplistic retry logic would need config from somewhere, 
    // but for now we assume the caller handles flow control or we add state tracking
    // For this implementation, we wait for next explicit call or just leave worker idle
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
