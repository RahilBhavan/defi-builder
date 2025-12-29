import type { LegoBlock } from '../../types';
import type { DeFiBacktestResult } from '../defiBacktestEngine';
import { BayesianOptimizer } from './algorithms/bayesianOptimizer';
import { GeneticOptimizer } from './algorithms/geneticOptimizer';
import { ParetoFrontier } from './algorithms/paretoFrontier';
import { BacktestWorkerPool } from './backtestWorker';
import type {
  ObjectiveScores,
  OptimizationConfig,
  OptimizationObjective,
  OptimizationProgress,
  OptimizationResult,
  OptimizationSolution,
  ParameterSet,
} from './types';
import { WalkForwardValidator } from './walkForwardValidator';

export class OptimizationEngine {
  private workerPool: BacktestWorkerPool;
  private walkForward: WalkForwardValidator;
  private paretoHelper: ParetoFrontier;
  private solutions: OptimizationSolution[] = [];
  private currentIteration = 0;
  private startTime = 0;
  private isRunning = false;
  private errors: string[] = [];
  private lastError: string | undefined;

  constructor() {
    // Set up error callback for worker pool
    this.workerPool = new BacktestWorkerPool(undefined, (errorInfo) => {
      const errorMessage = errorInfo.actionable
        ? `${errorInfo.message}. ${errorInfo.actionable}`
        : errorInfo.message;
      this.errors.push(errorMessage);
      this.lastError = errorMessage;

      // Keep only last 10 errors to avoid memory issues
      if (this.errors.length > 10) {
        this.errors.shift();
      }
    });
    this.walkForward = new WalkForwardValidator();
    this.paretoHelper = new ParetoFrontier();
  }

  async optimize(
    blocks: LegoBlock[],
    config: OptimizationConfig,
    onProgress?: (progress: OptimizationProgress) => void
  ): Promise<OptimizationResult> {
    this.isRunning = true;
    this.currentIteration = 0;
    this.solutions = [];
    this.errors = [];
    this.lastError = undefined;
    this.startTime = Date.now();

    try {
      if (config.algorithm === 'bayesian') {
        return await this.runBayesianOptimization(blocks, config, onProgress);
      } else {
        return await this.runGeneticOptimization(blocks, config, onProgress);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async runBayesianOptimization(
    blocks: LegoBlock[],
    config: OptimizationConfig,
    onProgress?: (progress: OptimizationProgress) => void
  ): Promise<OptimizationResult> {
    const optimizer = new BayesianOptimizer(config.parameters, config.objectives);
    const initialSamples = optimizer.generateInitialSamples(10);

    for (const parameters of initialSamples) {
      const solution = await this.evaluateSolution(blocks, parameters, config);
      optimizer.addObservation(parameters, solution.outOfSampleScores);
      this.currentIteration++;
      if (onProgress) onProgress(this.getProgress(config.maxIterations));
    }

    while (this.currentIteration < config.maxIterations && this.isRunning) {
      const nextParameters = optimizer.suggestNext();
      const solution = await this.evaluateSolution(blocks, nextParameters, config);
      optimizer.addObservation(nextParameters, solution.outOfSampleScores);
      this.currentIteration++;
      if (onProgress) onProgress(this.getProgress(config.maxIterations));
    }

    return this.buildResult(config);
  }

  private async runGeneticOptimization(
    blocks: LegoBlock[],
    config: OptimizationConfig,
    onProgress?: (progress: OptimizationProgress) => void
  ): Promise<OptimizationResult> {
    const optimizer = new GeneticOptimizer(config.parameters, config.objectives, 30);
    const maxGenerations = Math.ceil(config.maxIterations / 30);

    for (let gen = 0; gen < maxGenerations && this.isRunning; gen++) {
      const population = optimizer.getPopulation();

      for (const parameters of population) {
        const solution = await this.evaluateSolution(blocks, parameters, config);
        const primaryObjective = config.objectives[0];
        const fitness = solution.outOfSampleScores[primaryObjective] || 0;
        optimizer.setFitness(parameters, fitness);
        this.currentIteration++;
        if (onProgress) onProgress(this.getProgress(config.maxIterations));
      }

      optimizer.evolve();
    }

    return this.buildResult(config);
  }

  private async evaluateSolution(
    blocks: LegoBlock[],
    parameters: ParameterSet,
    config: OptimizationConfig
  ): Promise<OptimizationSolution> {
    try {
      const windows = this.walkForward.generateWindows(
        config.backtestConfig.startDate,
        config.backtestConfig.endDate
      );

      let inSampleScores: ObjectiveScores = {};
      let outOfSampleScores: ObjectiveScores = {};
      let failedWindows = 0;

      for (const window of windows) {
        try {
          const trainResult = await this.workerPool.runBacktest(blocks, parameters, {
            startDate: window.trainStart,
            endDate: window.trainEnd,
            initialCapital: config.backtestConfig.initialCapital,
            rebalanceInterval: config.backtestConfig.rebalanceInterval,
          });

          const testResult = await this.workerPool.runBacktest(blocks, parameters, {
            startDate: window.testStart,
            endDate: window.testEnd,
            initialCapital: config.backtestConfig.initialCapital,
            rebalanceInterval: config.backtestConfig.rebalanceInterval,
          });

          inSampleScores = this.aggregateScores(inSampleScores, trainResult.metrics);
          outOfSampleScores = this.aggregateScores(outOfSampleScores, testResult.metrics);
        } catch (error) {
          failedWindows++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error in backtest window';

          // Log error but continue with other windows
          console.warn(`Backtest window failed: ${errorMessage}`);

          // Only track unique errors
          if (!this.errors.includes(errorMessage)) {
            this.errors.push(errorMessage);
            this.lastError = errorMessage;
          }
        }
      }

      // If all windows failed, throw an error
      if (failedWindows === windows.length) {
        throw new Error(
          `All backtest windows failed. Last error: ${this.lastError || 'Unknown error'}`
        );
      }

      // If some windows failed, use available data
      const successfulWindows = windows.length - failedWindows;
      if (successfulWindows > 0) {
        inSampleScores = this.averageScores(inSampleScores, successfulWindows);
        outOfSampleScores = this.averageScores(outOfSampleScores, successfulWindows);
      }

      const degradation = this.walkForward.calculateDegradation(inSampleScores, outOfSampleScores);

      const solution: OptimizationSolution = {
        id: `solution-${this.solutions.length}`,
        parameters,
        inSampleScores,
        outOfSampleScores,
        degradation,
        isParetoOptimal: false,
      };

      this.solutions.push(solution);
      return solution;
    } catch (error) {
      // Create a failed solution with zero scores
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error evaluating solution';

      this.errors.push(errorMessage);
      this.lastError = errorMessage;

      // Return a solution with zero scores so optimization can continue
      const failedSolution: OptimizationSolution = {
        id: `solution-${this.solutions.length}-failed`,
        parameters,
        inSampleScores: {},
        outOfSampleScores: {},
        degradation: 100, // High degradation indicates failure
        isParetoOptimal: false,
      };

      this.solutions.push(failedSolution);
      return failedSolution;
    }
  }

  private aggregateScores(
    current: ObjectiveScores,
    metrics: DeFiBacktestResult['metrics']
  ): ObjectiveScores {
    return {
      sharpeRatio: (current.sharpeRatio || 0) + (metrics.sharpeRatio || 0),
      totalReturn: (current.totalReturn || 0) + (metrics.totalReturn || 0),
      maxDrawdown: (current.maxDrawdown || 0) + (metrics.maxDrawdown || 0),
      winRate: (current.winRate || 0) + (metrics.winTrades / metrics.totalTrades || 0),
      gasCosts: (current.gasCosts || 0) + (metrics.totalGasSpent || 0),
      protocolFees: (current.protocolFees || 0) + (metrics.totalFeesSpent || 0),
    };
  }

  private averageScores(scores: ObjectiveScores, count: number): ObjectiveScores {
    const result: ObjectiveScores = {};
    for (const key in scores) {
      const objKey = key as keyof ObjectiveScores;
      const value = scores[objKey];
      if (value !== undefined) {
        result[objKey] = value / count;
      }
    }
    return result;
  }

  private getProgress(maxIterations: number): OptimizationProgress {
    const paretoFrontier = this.paretoHelper.extractFrontier(
      this.solutions,
      this.getCurrentObjectives()
    );

    const bestSolution = paretoFrontier.length > 0 ? paretoFrontier[0] : undefined;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const iterationsRemaining = maxIterations - this.currentIteration;
    const avgTimePerIteration = this.currentIteration > 0 ? elapsed / this.currentIteration : 5;
    const estimatedTimeRemaining = iterationsRemaining * avgTimePerIteration;

    return {
      iteration: this.currentIteration,
      maxIterations,
      bestSolution,
      paretoFrontier,
      estimatedTimeRemaining,
      workersActive: this.workerPool.getActiveWorkerCount(),
      errors: this.errors.length > 0 ? [...this.errors] : undefined,
      lastError: this.lastError,
    };
  }

  private buildResult(config: OptimizationConfig): OptimizationResult {
    const paretoFrontier = this.paretoHelper.extractFrontier(this.solutions, config.objectives);

    return {
      config,
      solutions: this.solutions,
      paretoFrontier,
      totalIterations: this.currentIteration,
      totalTime: (Date.now() - this.startTime) / 1000,
      cacheHitRate: this.workerPool.getCacheStats().hitRate,
    };
  }

  private getCurrentObjectives(): OptimizationObjective[] {
    // Default to sharpe/drawdown if we can't infer yet
    return this.solutions.length > 0
      ? (Object.keys(this.solutions[0].inSampleScores) as OptimizationObjective[])
      : ['sharpeRatio', 'maxDrawdown'];
  }

  stop(): void {
    this.isRunning = false;
  }

  dispose(): void {
    this.workerPool.terminate();
  }
}

export const optimizationEngine = new OptimizationEngine();
