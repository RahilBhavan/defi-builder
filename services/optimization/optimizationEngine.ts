import { logger } from '../../lib/monitoring/logger';
import type { LegoBlock } from '../../types';
import type { DeFiBacktestResult } from '../defiBacktestEngine';
import { paperTradingEngine } from '../paperTrading';
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
  private bestScore = Number.NEGATIVE_INFINITY;
  private iterationsWithoutImprovement = 0;
  private readonly EARLY_STOPPING_PATIENCE = 10; // Stop if no improvement for 10 iterations
  private iterationTimes: number[] = []; // Track recent iteration times for better estimation
  private onProgress?: (progress: OptimizationProgress) => void;
  private currentPhase: 'initializing' | 'evaluating' | 'optimizing' | 'finalizing' =
    'initializing';
  private progressUpdateInterval?: NodeJS.Timeout;
  private lastProgressUpdate = 0;
  private readonly PROGRESS_UPDATE_THROTTLE_MS = 100; // Throttle progress updates to max once per 100ms
  // abortController reserved for future cancellation support

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
    // Cancel any existing optimization
    this.stop();

    this.isRunning = true;
    this.currentIteration = 0;
    this.solutions = [];
    this.errors = [];
    this.lastError = undefined;
    this.startTime = Date.now();
    this.bestScore = Number.NEGATIVE_INFINITY;
    this.iterationsWithoutImprovement = 0;
    this.iterationTimes = [];
    this.onProgress = onProgress;
    this.currentPhase = 'initializing';

    // Send initial progress update
    logger.info(
      `Starting optimization: ${config.algorithm}, maxIterations: ${config.maxIterations}`,
      'OptimizationEngine'
    );
    this.sendProgressUpdate(config.maxIterations);

    try {
      if (config.algorithm === 'bayesian') {
        return await this.runBayesianOptimization(blocks, config, onProgress);
      }
      return await this.runGeneticOptimization(blocks, config, onProgress);
    } finally {
      this.isRunning = false;
      this.currentPhase = 'finalizing';

      // Clear progress update interval if it exists
      if (this.progressUpdateInterval) {
        clearInterval(this.progressUpdateInterval);
        this.progressUpdateInterval = undefined;
      }

      this.sendProgressUpdate(config.maxIterations);
    }
  }

  private async runBayesianOptimization(
    blocks: LegoBlock[],
    config: OptimizationConfig,
    onProgress?: (progress: OptimizationProgress) => void
  ): Promise<OptimizationResult> {
    this.currentPhase = 'initializing';
    const optimizer = new BayesianOptimizer(config.parameters, config.objectives);
    const initialSamples = optimizer.generateInitialSamples(10);

    // Track iteration start time
    let iterationStartTime = Date.now();

    for (const parameters of initialSamples) {
      if (!this.isRunning) break;

      this.currentPhase = 'evaluating';
      logger.debug(`Evaluating solution ${this.currentIteration + 1}`, 'OptimizationEngine');

      let solution: OptimizationSolution;
      try {
        // Add timeout to prevent hanging - reduced to 30 seconds for faster failure
        const evaluationPromise = this.evaluateSolution(blocks, parameters, config);
        const timeoutPromise = new Promise<OptimizationSolution>((_, reject) => {
          setTimeout(
            () => reject(new Error('Solution evaluation timeout after 30 seconds')),
            30000
          );
        });

        solution = await Promise.race([evaluationPromise, timeoutPromise]);
      } catch (error) {
        logger.error(
          `Solution evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : new Error(String(error)),
          'OptimizationEngine'
        );
        // Return failed solution so optimization can continue
        solution = {
          id: `solution-${this.solutions.length}-timeout`,
          parameters,
          inSampleScores: {},
          outOfSampleScores: {},
          degradation: 100,
          isParetoOptimal: false,
        };
        this.solutions.push(solution);
      }

      logger.debug(`Solution ${this.currentIteration + 1} evaluated`, 'OptimizationEngine');
      optimizer.addObservation(parameters, solution.outOfSampleScores);
      // Always increment iteration, even if evaluation failed
      this.currentIteration++;

      // Track iteration time for better estimation
      const iterationTime = (Date.now() - iterationStartTime) / 1000;
      this.recordIterationTime(iterationTime);
      iterationStartTime = Date.now();

      this.currentPhase = 'optimizing';
      this.sendProgressUpdate(config.maxIterations);
    }

    this.currentPhase = 'optimizing';
    logger.info(
      `Starting main optimization loop: ${this.currentIteration}/${config.maxIterations}`,
      'OptimizationEngine'
    );
    while (this.currentIteration < config.maxIterations && this.isRunning) {
      const nextParameters = optimizer.suggestNext();

      this.currentPhase = 'evaluating';
      let solution: OptimizationSolution;
      try {
        solution = await this.evaluateSolution(blocks, nextParameters, config);
      } catch (error) {
        logger.error(
          `Solution evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : new Error(String(error)),
          'OptimizationEngine'
        );
        // Return failed solution so optimization can continue
        solution = {
          id: `solution-${this.solutions.length}-timeout`,
          parameters: nextParameters,
          inSampleScores: {},
          outOfSampleScores: {},
          degradation: 100,
          isParetoOptimal: false,
        };
        this.solutions.push(solution);
      }
      optimizer.addObservation(nextParameters, solution.outOfSampleScores);
      // Always increment iteration, even if evaluation failed
      this.currentIteration++;

      // Track iteration time
      const iterationTime = (Date.now() - iterationStartTime) / 1000;
      this.recordIterationTime(iterationTime);
      iterationStartTime = Date.now();

      // Early stopping check
      const primaryObjective = config.objectives[0] ?? 'sharpeRatio';
      const currentScore = solution.outOfSampleScores[primaryObjective] ?? 0;
      if (currentScore > this.bestScore) {
        this.bestScore = currentScore;
        this.iterationsWithoutImprovement = 0;
      } else {
        this.iterationsWithoutImprovement++;
      }

      this.currentPhase = 'optimizing';
      this.sendProgressUpdate(config.maxIterations);

      // Early stopping: stop if no improvement for patience iterations
      if (
        this.iterationsWithoutImprovement >= this.EARLY_STOPPING_PATIENCE &&
        this.currentIteration > 15
      ) {
        logger.info(
          `Early stopping triggered after ${this.currentIteration} iterations (no improvement for ${this.iterationsWithoutImprovement} iterations)`,
          'OptimizationEngine'
        );
        break;
      }
    }

    return this.buildResult(config);
  }

  private async runGeneticOptimization(
    blocks: LegoBlock[],
    config: OptimizationConfig,
    onProgress?: (progress: OptimizationProgress) => void
  ): Promise<OptimizationResult> {
    this.currentPhase = 'initializing';
    const optimizer = new GeneticOptimizer(config.parameters, config.objectives, 30);
    const maxGenerations = Math.ceil(config.maxIterations / 30);

    let iterationStartTime = Date.now();

    for (let gen = 0; gen < maxGenerations && this.isRunning; gen++) {
      const population = optimizer.getPopulation();

      this.currentPhase = 'evaluating';
      for (const parameters of population) {
        if (!this.isRunning) break;

        logger.debug(`Evaluating solution ${this.currentIteration + 1}`, 'OptimizationEngine');

        let solution: OptimizationSolution;
        try {
          // Add timeout to prevent hanging - reduced to 30 seconds for faster failure
          const evaluationPromise = this.evaluateSolution(blocks, parameters, config);
          const timeoutPromise = new Promise<OptimizationSolution>((_, reject) => {
            setTimeout(
              () => reject(new Error('Solution evaluation timeout after 30 seconds')),
              30000
            );
          });

          solution = await Promise.race([evaluationPromise, timeoutPromise]);
        } catch (error) {
          logger.error(
            `Solution evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : new Error(String(error)),
            'OptimizationEngine'
          );
          // Return failed solution so optimization can continue
          solution = {
            id: `solution-${this.solutions.length}-timeout`,
            parameters,
            inSampleScores: {},
            outOfSampleScores: {},
            degradation: 100,
            isParetoOptimal: false,
          };
          this.solutions.push(solution);
        }

        // Always increment iteration, even if evaluation failed
        this.currentIteration++;

        const primaryObjective = config.objectives[0] ?? 'sharpeRatio';
        const fitness = solution.outOfSampleScores[primaryObjective] || 0;
        optimizer.setFitness(parameters, fitness);

        // Track iteration time
        const iterationTime = (Date.now() - iterationStartTime) / 1000;
        this.recordIterationTime(iterationTime);
        iterationStartTime = Date.now();

        // Early stopping check
        if (fitness > this.bestScore) {
          this.bestScore = fitness;
          this.iterationsWithoutImprovement = 0;
        } else {
          this.iterationsWithoutImprovement++;
        }

        // Send throttled progress update
        this.currentPhase = 'optimizing';
        this.sendProgressUpdate(config.maxIterations);
      }

      // Early stopping: stop if no improvement for patience iterations
      if (
        this.iterationsWithoutImprovement >= this.EARLY_STOPPING_PATIENCE &&
        this.currentIteration > 20
      ) {
        logger.info(
          `Early stopping triggered after generation ${gen + 1} (no improvement for ${this.iterationsWithoutImprovement} iterations)`,
          'OptimizationEngine'
        );
        break;
      }

      this.currentPhase = 'optimizing';
      optimizer.evolve();
      this.sendProgressUpdate(config.maxIterations);
    }

    return this.buildResult(config);
  }

  private async evaluateSolution(
    blocks: LegoBlock[],
    parameters: ParameterSet,
    config: OptimizationConfig
  ): Promise<OptimizationSolution> {
    try {
      logger.debug(`Evaluating solution with ${blocks.length} blocks`, 'OptimizationEngine');

      // Check if using paper trading data source
      const dataSource = config.dataSource || 'backtest';
      if (dataSource === 'paperTrading' && config.paperTradingSessionId) {
        return await this.evaluateSolutionWithPaperTrading(blocks, parameters, config);
      }

      const windows = this.walkForward.generateWindows(
        config.backtestConfig.startDate,
        config.backtestConfig.endDate
      );
      logger.debug(`Generated ${windows.length} walk-forward windows`, 'OptimizationEngine');

      let inSampleScores: ObjectiveScores = {};
      let outOfSampleScores: ObjectiveScores = {};
      let failedWindows = 0;

      // Parallelize window execution for 3x speedup
      // Note: Progress updates during window evaluation are not useful since
      // all windows run in parallel and complete at roughly the same time

      const windowResults = await Promise.allSettled(
        windows.map(async (window) => {
          try {
            const [trainResult, testResult] = await Promise.all([
              this.workerPool.runBacktest(blocks, parameters, {
                startDate: window.trainStart,
                endDate: window.trainEnd,
                initialCapital: config.backtestConfig.initialCapital,
                rebalanceInterval: config.backtestConfig.rebalanceInterval,
              }),
              this.workerPool.runBacktest(blocks, parameters, {
                startDate: window.testStart,
                endDate: window.testEnd,
                initialCapital: config.backtestConfig.initialCapital,
                rebalanceInterval: config.backtestConfig.rebalanceInterval,
              }),
            ]);

            return { trainResult, testResult };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error in backtest window';
            throw new Error(errorMessage);
          }
        })
      );

      // Process results and store representative backtest result
      let representativeBacktest: DeFiBacktestResult | undefined;
      for (const result of windowResults) {
        if (result.status === 'fulfilled') {
          inSampleScores = this.aggregateScores(inSampleScores, result.value.trainResult.metrics);
          outOfSampleScores = this.aggregateScores(
            outOfSampleScores,
            result.value.testResult.metrics
          );

          // Store the last successful out-of-sample result as representative
          // This gives us a complete equity curve for visualization
          representativeBacktest = result.value.testResult;
        } else {
          failedWindows++;
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown error in backtest window';

          // Log error but continue with other windows
          logger.warn(`Backtest window failed: ${errorMessage}`, 'OptimizationEngine');

          // Only track unique errors
          if (!this.errors.includes(errorMessage)) {
            this.errors.push(errorMessage);
            this.lastError = errorMessage;
          }
        }
      }

      // If all windows failed, log error but return a failed solution instead of throwing
      // This allows optimization to continue and try other parameters
      if (failedWindows === windows.length) {
        logger.error(
          `All backtest windows failed for solution. Last error: ${this.lastError || 'Unknown error'}`,
          new Error('All windows failed'),
          'OptimizationEngine'
        );
        // Return a failed solution with zero scores so optimization can continue
        const failedSolution: OptimizationSolution = {
          id: `solution-${this.solutions.length}-failed`,
          parameters,
          inSampleScores: {},
          outOfSampleScores: {},
          degradation: 100,
          isParetoOptimal: false,
        };
        this.solutions.push(failedSolution);
        return failedSolution;
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
        backtestResult: representativeBacktest, // Store for visualization
      };

      this.solutions.push(solution);
      return solution;
    } catch (error) {
      // Create a failed solution with zero scores
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error evaluating solution';

      logger.error(
        `Error evaluating solution: ${errorMessage}`,
        error instanceof Error ? error : new Error(String(error)),
        'OptimizationEngine'
      );

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

  /**
   * Evaluate solution using paper trading results
   */
  private async evaluateSolutionWithPaperTrading(
    _blocks: LegoBlock[],
    parameters: ParameterSet,
    config: OptimizationConfig
  ): Promise<OptimizationSolution> {
    if (!config.paperTradingSessionId) {
      throw new Error('Paper trading session ID is required when using paper trading data source');
    }

    try {
      const session = paperTradingEngine.getSession(config.paperTradingSessionId);
      if (!session) {
        throw new Error(`Paper trading session ${config.paperTradingSessionId} not found`);
      }

      if (session.status !== 'running' && session.status !== 'stopped') {
        throw new Error(
          `Paper trading session ${config.paperTradingSessionId} is not in a valid state`
        );
      }

      // Use paper trading results directly
      const paperTradingResult = session.results;

      // Convert paper trading metrics to objective scores
      const outOfSampleScores: ObjectiveScores = {
        sharpeRatio: paperTradingResult.metrics.sharpeRatio,
        totalReturn: paperTradingResult.metrics.totalReturn,
        maxDrawdown: paperTradingResult.metrics.maxDrawdown,
        winRate:
          paperTradingResult.metrics.totalTrades > 0
            ? paperTradingResult.metrics.winTrades / paperTradingResult.metrics.totalTrades
            : 0,
        gasCosts: paperTradingResult.metrics.totalGasSpent,
        protocolFees: paperTradingResult.metrics.totalFeesSpent,
      };

      // For paper trading, we don't have in-sample/out-of-sample split
      // Use the same scores for both
      const inSampleScores = { ...outOfSampleScores };

      const solution: OptimizationSolution = {
        id: `solution-${this.solutions.length}`,
        parameters,
        inSampleScores,
        outOfSampleScores,
        degradation: 0, // No degradation for paper trading (single evaluation)
        isParetoOptimal: false,
        backtestResult: paperTradingResult,
      };

      this.solutions.push(solution);
      return solution;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error evaluating solution with paper trading';

      logger.error(
        `Error evaluating solution with paper trading: ${errorMessage}`,
        error instanceof Error ? error : new Error(String(error)),
        'OptimizationEngine'
      );

      this.errors.push(errorMessage);
      this.lastError = errorMessage;

      // Return a failed solution
      const failedSolution: OptimizationSolution = {
        id: `solution-${this.solutions.length}-failed`,
        parameters,
        inSampleScores: {},
        outOfSampleScores: {},
        degradation: 100,
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

    // Use smoothed average of recent iterations for better time estimation
    const avgTimePerIteration = this.getAverageIterationTime();
    const estimatedTimeRemaining = Math.max(0, iterationsRemaining * avgTimePerIteration);

    const cacheStats = this.workerPool.getCacheStats();

    return {
      iteration: this.currentIteration,
      maxIterations,
      bestSolution,
      paretoFrontier,
      estimatedTimeRemaining,
      elapsedTime: elapsed,
      workersActive: this.workerPool.getActiveWorkerCount(),
      solutionsEvaluated: this.solutions.length,
      cacheHitRate: cacheStats.hitRate,
      currentPhase: this.currentPhase,
      errors: this.errors.length > 0 ? [...this.errors] : undefined,
      lastError: this.lastError,
    };
  }

  /**
   * Throttled progress update - only sends updates if enough time has passed
   */
  private sendProgressUpdate(maxIterations: number): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate < this.PROGRESS_UPDATE_THROTTLE_MS) {
      return; // Skip if too soon
    }
    this.lastProgressUpdate = now;

    if (this.onProgress) {
      this.onProgress(this.getProgress(maxIterations));
    }
  }

  /**
   * Record iteration time and maintain a rolling window for better estimation
   */
  private recordIterationTime(time: number): void {
    this.iterationTimes.push(time);
    // Keep only last 10 iteration times for smoothing
    if (this.iterationTimes.length > 10) {
      this.iterationTimes.shift();
    }
  }

  /**
   * Get smoothed average iteration time using recent iterations
   */
  private getAverageIterationTime(): number {
    if (this.iterationTimes.length === 0) {
      // If no iterations yet, use a conservative estimate based on elapsed time
      const elapsed = (Date.now() - this.startTime) / 1000;
      return this.currentIteration > 0 ? elapsed / this.currentIteration : 5;
    }

    // Weight recent iterations more heavily
    const recentWeight = 0.7;
    const olderWeight = 0.3;
    const recentAvg =
      this.iterationTimes.slice(-3).reduce((a, b) => a + b, 0) /
      Math.min(3, this.iterationTimes.length);
    const olderAvg =
      this.iterationTimes.length > 3
        ? this.iterationTimes.slice(0, -3).reduce((a, b) => a + b, 0) /
          (this.iterationTimes.length - 3)
        : recentAvg;

    return recentAvg * recentWeight + olderAvg * olderWeight;
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
    const firstSolution = this.solutions[0];
    return firstSolution
      ? (Object.keys(firstSolution.inSampleScores) as OptimizationObjective[])
      : ['sharpeRatio', 'maxDrawdown'];
  }

  stop(): void {
    this.isRunning = false;
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = undefined;
    }
  }

  dispose(): void {
    this.workerPool.terminate();
  }
}

export const optimizationEngine = new OptimizationEngine();
