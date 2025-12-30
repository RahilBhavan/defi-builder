import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CheckCircle,
  List,
  Play,
  Sliders,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useToast } from '../hooks/useToast';
import { getUserFriendlyErrorMessage } from '../utils/errorHandler';
import {
  type OptimizationAlgorithm,
  type OptimizationConfig,
  type OptimizationObjective,
  type OptimizationProgress,
  type OptimizationResult,
  type OptimizationSolution,
  optimizationEngine,
} from '../services/optimization';
import { parameterExtractor } from '../services/optimization/parameterExtractor';
import type { BlockParams, LegoBlock } from '../types';
import { type ConvergenceDataPoint, ConvergenceGraph } from './optimization/ConvergenceGraph';
import { SolutionComparison } from './optimization/SolutionComparison';
import { Button } from './ui/Button';

type OptimizationView = 'pareto' | 'convergence' | 'solutions' | 'log';

interface OptimizationPanelProps {
  onClose: () => void;
  isOpen: boolean;
  blocks: LegoBlock[];
  onApplySolution?: (updatedBlocks: LegoBlock[]) => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  onClose,
  isOpen,
  blocks,
  onApplySolution,
}) => {
  const { error: showError, warning: showWarning, success: showSuccess } = useToast();
  const [algorithm, setAlgorithm] = useState<OptimizationAlgorithm>('bayesian');
  const [objectives, setObjectives] = useState<OptimizationObjective[]>([
    'sharpeRatio',
    'maxDrawdown',
  ]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [paretoFrontier, setParetoFrontier] = useState<OptimizationSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<OptimizationSolution | null>(null);
  const [convergenceHistory, setConvergenceHistory] = useState<ConvergenceDataPoint[]>([]);
  const [iterationLog, setIterationLog] = useState<
    Array<{
      iteration: number;
      timestamp: number;
      bestScores: Record<string, number>;
      error?: string;
    }>
  >([]);
  const [activeView, setActiveView] = useState<OptimizationView>('pareto');

  // Prepare data for Pareto frontier visualization
  const paretoChartData = useMemo(() => {
    if (paretoFrontier.length === 0 || objectives.length < 2) return [];

    const xObjective = objectives[0]!;
    const yObjective = objectives[1]!;

    return paretoFrontier.map((solution, index) => {
      const xValue = solution.outOfSampleScores[xObjective] ?? 0;
      const yValue = solution.outOfSampleScores[yObjective] ?? 0;

      // For maxDrawdown, we want to minimize, so invert for visualization
      const displayX = xObjective === 'maxDrawdown' ? -xValue : xValue;
      const displayY = yObjective === 'maxDrawdown' ? -yValue : yValue;

      return {
        x: displayX,
        y: displayY,
        solution,
        index,
      };
    });
  }, [paretoFrontier, objectives]);

  // Apply selected solution to blocks
  const handleApplySolution = useCallback(() => {
    if (!selectedSolution || !onApplySolution) {
      showWarning('Please select a solution to apply');
      return;
    }

    const updatedBlocks = blocks.map((block) => {
      const blockParams = selectedSolution.parameters[block.id];
      if (!blockParams) return block;

      const updatedParams: BlockParams = { ...block.params };
      Object.entries(blockParams).forEach(([paramName, value]) => {
        updatedParams[paramName] = value;
      });

      return { ...block, params: updatedParams };
    });

    onApplySolution(updatedBlocks);
    showSuccess('Optimized parameters applied to blocks');
    setSelectedSolution(null);
  }, [selectedSolution, blocks, onApplySolution, showSuccess, showWarning]);

  const handleObjectiveToggle = (objective: OptimizationObjective) => {
    if (objectives.includes(objective)) {
      if (objectives.length > 2) {
        setObjectives(objectives.filter((o) => o !== objective));
      }
    } else {
      setObjectives([...objectives, objective]);
    }
  };

  const handleStartOptimization = useCallback(async () => {
    if (blocks.length === 0) {
      showWarning('Please add blocks to your strategy before optimizing');
      return;
    }

    setIsOptimizing(true);
    setProgress(null);
    setResult(null);
    setParetoFrontier([]);
    setConvergenceHistory([]);
    setIterationLog([]);
    setSelectedSolution(null);

    try {
      // Extract optimizable parameters from blocks
      const parameters = parameterExtractor.extract(blocks);

      if (parameters.length === 0) {
        showWarning(
          'No optimizable parameters found in current blocks. Add blocks with configurable parameters (e.g., slippage, thresholds) to enable optimization.'
        );
        setIsOptimizing(false);
        return;
      }

      // Create optimization config
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // 6 months back

      const config: OptimizationConfig = {
        algorithm,
        objectives,
        maxIterations: algorithm === 'bayesian' ? 50 : 100,
        parameters,
        backtestConfig: {
          startDate,
          endDate,
          initialCapital: 10000,
          rebalanceInterval: 86400000, // 1 day
        },
      };

      // Run optimization with progress updates
      const optimizationResult = await optimizationEngine.optimize(
        blocks,
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
          setParetoFrontier(progressUpdate.paretoFrontier);

          // Track convergence history
          if (progressUpdate.bestSolution) {
            const convergencePoint: ConvergenceDataPoint = {
              iteration: progressUpdate.iteration,
            };
            objectives.forEach((obj) => {
              const value = progressUpdate.bestSolution?.outOfSampleScores[obj];
              if (value !== undefined) {
                convergencePoint[obj] = value;
              }
            });
            setConvergenceHistory((prev) => [...prev, convergencePoint]);
          }

          // Track iteration log
          if (progressUpdate.bestSolution) {
            const bestScores: Record<string, number> = {};
            Object.entries(progressUpdate.bestSolution.outOfSampleScores).forEach(([key, value]) => {
              if (value !== undefined && typeof value === 'number') {
                bestScores[key] = value;
              }
            });
            setIterationLog((prev) => [
              ...prev,
              {
                iteration: progressUpdate.iteration,
                timestamp: Date.now(),
                bestScores,
                error: progressUpdate.lastError,
              },
            ]);
          } else if (progressUpdate.lastError) {
            // Log error even without best solution
            setIterationLog((prev) => [
              ...prev,
              {
                iteration: progressUpdate.iteration,
                timestamp: Date.now(),
                bestScores: {},
                error: progressUpdate.lastError,
              },
            ]);
          }

          // Show errors from progress if any
          if (progressUpdate.lastError) {
            showError(progressUpdate.lastError);
          }
        }
      );

      setResult(optimizationResult);
      setParetoFrontier(optimizationResult.paretoFrontier);
      showSuccess(
        `Optimization complete! Found ${optimizationResult.paretoFrontier.length} Pareto-optimal solutions.`
      );
    } catch (error) {
      console.error('Optimization failed:', error);
      // getUserFriendlyErrorMessage is already imported at the top
      showError(getUserFriendlyErrorMessage(error, 'optimization'));
    } finally {
      setIsOptimizing(false);
    }
  }, [blocks, algorithm, objectives, showError, showWarning, showSuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOptimizing) {
        optimizationEngine.stop();
      }
    };
  }, [isOptimizing]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-canvas/95 backdrop-blur-md z-50 flex flex-col"
    >
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-8 border-b border-ink bg-white">
        <div className="flex items-center gap-3">
          <Zap className="text-orange" size={24} />
          <h1 className="text-2xl font-bold font-mono tracking-tighter">HYPER-OPTIMIZER</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 text-ink border border-transparent hover:border-gray-300 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Configuration */}
        <div className="w-[320px] bg-gray-50 border-r border-gray-300 p-8 flex flex-col overflow-y-auto">
          <div className="space-y-8">
            {/* Algorithm */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-ink font-bold font-mono text-sm uppercase">
                <Sliders size={16} />
                Algorithm
              </div>
              <div className="space-y-3">
                <label
                  className={`block p-4 border cursor-pointer transition-all ${algorithm === 'bayesian' ? 'bg-white border-orange shadow-sm' : 'border-gray-300 hover:border-gray-400'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="algorithm"
                      value="bayesian"
                      checked={algorithm === 'bayesian'}
                      onChange={(e) => setAlgorithm(e.target.value as OptimizationAlgorithm)}
                      className="accent-orange w-4 h-4"
                    />
                    <span className="font-bold text-sm">Bayesian Optimization</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-7 leading-relaxed">
                    Gaussian process. Fast convergence. Best for 3-8 parameters.
                  </p>
                </label>

                <label
                  className={`block p-4 border cursor-pointer transition-all ${algorithm === 'genetic' ? 'bg-white border-orange shadow-sm' : 'border-gray-300 hover:border-gray-400'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="algorithm"
                      value="genetic"
                      checked={algorithm === 'genetic'}
                      onChange={(e) => setAlgorithm(e.target.value as OptimizationAlgorithm)}
                      className="accent-orange w-4 h-4"
                    />
                    <span className="font-bold text-sm">Genetic Algorithm</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-7 leading-relaxed">
                    Evolutionary approach. Deep exploration. Best for complex strategies.
                  </p>
                </label>
              </div>
            </div>

            {/* Optimization Presets */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-ink font-bold font-mono text-sm uppercase">
                <Zap size={16} />
                Presets
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setObjectives(['sharpeRatio', 'maxDrawdown']);
                    setAlgorithm('bayesian');
                  }}
                  className="w-full p-3 bg-white border border-gray-200 hover:border-orange text-left transition-all"
                >
                  <div className="font-bold text-sm mb-1">Conservative</div>
                  <div className="text-xs text-gray-500">
                    Focus: Sharpe Ratio, Max Drawdown | Bayesian
                  </div>
                </button>
                <button
                  onClick={() => {
                    setObjectives(['totalReturn', 'sharpeRatio', 'maxDrawdown']);
                    setAlgorithm('bayesian');
                  }}
                  className="w-full p-3 bg-white border border-gray-200 hover:border-orange text-left transition-all"
                >
                  <div className="font-bold text-sm mb-1">Balanced</div>
                  <div className="text-xs text-gray-500">
                    Focus: Return, Sharpe, Drawdown | Bayesian
                  </div>
                </button>
                <button
                  onClick={() => {
                    setObjectives(['totalReturn', 'winRate']);
                    setAlgorithm('genetic');
                  }}
                  className="w-full p-3 bg-white border border-gray-200 hover:border-orange text-left transition-all"
                >
                  <div className="font-bold text-sm mb-1">Aggressive</div>
                  <div className="text-xs text-gray-500">
                    Focus: Total Return, Win Rate | Genetic
                  </div>
                </button>
              </div>
            </div>

            {/* Objectives */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-ink font-bold font-mono text-sm uppercase">
                <Activity size={16} />
                Objectives (Min 2)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    'sharpeRatio',
                    'totalReturn',
                    'maxDrawdown',
                    'winRate',
                    'gasCosts',
                  ] as OptimizationObjective[]
                ).map((objective) => (
                  <label
                    key={objective}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={objectives.includes(objective)}
                      onChange={() => handleObjectiveToggle(objective)}
                      className="accent-ink w-4 h-4"
                    />
                    <span className="text-sm font-mono uppercase">
                      {objective.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleStartOptimization}
              disabled={isOptimizing || objectives.length < 2}
              fullWidth
              className="mt-4"
            >
              {isOptimizing ? 'OPTIMIZING...' : 'START RUN'}
            </Button>
          </div>
        </div>

        {/* Center Column - Visualization */}
        <div className="flex-1 bg-white p-8 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
          <div className="relative z-10 w-full h-full flex flex-col">
            {isOptimizing && progress ? (
              <div className="space-y-4 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-sm text-gray-500 uppercase animate-pulse">
                  Running Simulation...
                </p>
                <div className="mt-4 space-y-2 w-full max-w-md">
                  <div className="flex justify-between text-xs font-mono text-gray-400">
                    <span>
                      Iteration {progress.iteration} / {progress.maxIterations}
                    </span>
                    <span>{Math.round((progress.iteration / progress.maxIterations) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200">
                    <div
                      className="h-full bg-orange transition-all"
                      style={{ width: `${(progress.iteration / progress.maxIterations) * 100}%` }}
                    />
                  </div>
                  {progress.estimatedTimeRemaining > 0 && (
                    <p className="font-mono text-xs text-gray-400 text-center">
                      ~{Math.ceil(progress.estimatedTimeRemaining / 60)} min remaining
                    </p>
                  )}
                  {progress.bestSolution && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-xs font-mono">
                      <div className="font-bold mb-1">Best Solution So Far:</div>
                      {objectives.map((obj) => {
                        const value = progress.bestSolution?.outOfSampleScores[obj];
                        return value !== undefined ? (
                          <div key={obj} className="text-gray-600">
                            {obj}: {value.toFixed(2)}
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  {progress.workersActive > 0 && (
                    <p className="font-mono text-xs text-gray-400 text-center">
                      {progress.workersActive} worker{progress.workersActive > 1 ? 's' : ''} active
                    </p>
                  )}
                </div>
              </div>
            ) : result && paretoChartData.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* View Tabs */}
                <div className="flex gap-2 mb-4 border-b border-gray-200">
                  <button
                    onClick={() => setActiveView('pareto')}
                    className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
                      activeView === 'pareto'
                        ? 'border-orange text-ink'
                        : 'border-transparent text-gray-500 hover:text-ink'
                    }`}
                  >
                    <BarChart3 size={14} className="inline mr-2" />
                    Pareto Frontier
                  </button>
                  <button
                    onClick={() => setActiveView('convergence')}
                    className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
                      activeView === 'convergence'
                        ? 'border-orange text-ink'
                        : 'border-transparent text-gray-500 hover:text-ink'
                    }`}
                  >
                    <TrendingUp size={14} className="inline mr-2" />
                    Convergence
                  </button>
                  <button
                    onClick={() => setActiveView('solutions')}
                    className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
                      activeView === 'solutions'
                        ? 'border-orange text-ink'
                        : 'border-transparent text-gray-500 hover:text-ink'
                    }`}
                  >
                    <List size={14} className="inline mr-2" />
                    Solutions ({result.paretoFrontier.length})
                  </button>
                  <button
                    onClick={() => setActiveView('log')}
                    className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
                      activeView === 'log'
                        ? 'border-orange text-ink'
                        : 'border-transparent text-gray-500 hover:text-ink'
                    }`}
                  >
                    <Activity size={14} className="inline mr-2" />
                    Log ({iterationLog.length})
                  </button>
                </div>

                {/* View Content */}
                {activeView === 'pareto' ? (
                  <>
                    <div className="mb-4">
                      <p className="font-mono text-sm text-ink uppercase font-bold">
                        Pareto Frontier
                      </p>
                      <p className="font-mono text-xs text-gray-500">
                        {result.paretoFrontier.length} optimal solutions | {objectives[0]} vs{' '}
                        {objectives[1]}
                      </p>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name={objectives[0]}
                            label={{ value: objectives[0], position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name={objectives[1]}
                            label={{ value: objectives[1], angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload[0]) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-gray-300 p-2 text-xs font-mono">
                                    <p className="font-bold">Solution #{data.index + 1}</p>
                                    {objectives.map((obj) => {
                                      const value = data.solution.outOfSampleScores[obj];
                                      return value !== undefined ? (
                                        <p key={obj}>
                                          {obj}: {value.toFixed(2)}
                                        </p>
                                      ) : null;
                                    })}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter
                            name="Pareto Frontier"
                            data={paretoChartData}
                            fill="#FF5500"
                            onClick={(data) => {
                              if (data && data.solution) {
                                setSelectedSolution(data.solution);
                              }
                            }}
                          >
                            {paretoChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  selectedSolution?.id === entry.solution.id ? '#FF5500' : '#FF5500'
                                }
                                stroke={
                                  selectedSolution?.id === entry.solution.id ? '#000' : 'none'
                                }
                                strokeWidth={selectedSolution?.id === entry.solution.id ? 2 : 0}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : activeView === 'convergence' && convergenceHistory.length > 0 ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-4">
                      <p className="font-mono text-sm text-ink uppercase font-bold">
                        Convergence History
                      </p>
                      <p className="font-mono text-xs text-gray-500">
                        Objective values over {convergenceHistory.length} iterations
                      </p>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ConvergenceGraph data={convergenceHistory} objectives={objectives} />
                    </div>
                  </div>
                ) : activeView === 'solutions' ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-4">
                      <p className="font-mono text-sm text-ink uppercase font-bold">
                        Solution Comparison
                      </p>
                      <p className="font-mono text-xs text-gray-500">
                        Compare and select from {result.paretoFrontier.length} Pareto-optimal
                        solutions
                      </p>
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto">
                      <SolutionComparison
                        solutions={result.paretoFrontier}
                        objectives={objectives}
                        selectedSolutionId={selectedSolution?.id || null}
                        onSelectSolution={setSelectedSolution}
                      />
                    </div>
                  </div>
                ) : activeView === 'log' ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-4">
                      <p className="font-mono text-sm text-ink uppercase font-bold">
                        Iteration Log
                      </p>
                      <p className="font-mono text-xs text-gray-500">
                        {iterationLog.length} iterations completed
                      </p>
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto">
                      <div className="space-y-2">
                        {iterationLog.map((log, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-gray-200 p-3 text-xs font-mono"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-ink">Iteration {log.iteration}</span>
                              <span className="text-gray-400">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {log.error ? (
                              <div className="text-alert-red text-[10px]">Error: {log.error}</div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {Object.entries(log.bestScores).map(([obj, value]) => (
                                  <div key={obj} className="text-gray-600">
                                    <span className="text-gray-400">{obj}:</span>{' '}
                                    <span className="font-bold">{value.toFixed(4)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : result ? (
              <div className="space-y-4 flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="font-mono text-sm text-ink uppercase font-bold">
                    Optimization Complete
                  </p>
                  <p className="font-mono text-xs text-gray-500 mt-2">
                    Found {result.paretoFrontier.length} Pareto-optimal solutions
                  </p>
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    Total time: {Math.round(result.totalTime)}s | Iterations:{' '}
                    {result.totalIterations}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 opacity-40 flex items-center justify-center h-full">
                <div className="text-center">
                  <Play size={64} className="mx-auto text-gray-400" />
                  <p className="font-mono text-sm text-gray-500 uppercase mt-4">
                    Configure and start optimization to view Pareto Frontier
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="w-[300px] bg-gray-50 border-l border-gray-300 p-6 font-mono text-sm overflow-y-auto">
          <h2 className="font-bold text-ink uppercase mb-6 flex items-center gap-2">
            Results
            <span className="text-xs font-normal text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
              {paretoFrontier.length}
            </span>
          </h2>
          {paretoFrontier.length > 0 ? (
            <div className="space-y-3">
              {paretoFrontier.slice(0, 10).map((solution, idx) => {
                const isSelected = selectedSolution?.id === solution.id;
                return (
                  <div
                    key={solution.id}
                    className={`bg-white border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange border-2 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSolution(solution)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-ink">Solution #{idx + 1}</div>
                      {isSelected && <CheckCircle size={14} className="text-orange" />}
                    </div>
                    <div className="space-y-1 text-[10px]">
                      {solution.outOfSampleScores.sharpeRatio !== undefined && (
                        <div>Sharpe: {solution.outOfSampleScores.sharpeRatio.toFixed(2)}</div>
                      )}
                      {solution.outOfSampleScores.totalReturn !== undefined && (
                        <div>Return: {solution.outOfSampleScores.totalReturn.toFixed(2)}%</div>
                      )}
                      {solution.outOfSampleScores.maxDrawdown !== undefined && (
                        <div>DD: {solution.outOfSampleScores.maxDrawdown.toFixed(2)}%</div>
                      )}
                      {solution.degradation !== undefined && (
                        <div className="text-gray-400">
                          Degradation: {solution.degradation.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {paretoFrontier.length > 10 && (
                <div className="text-xs text-gray-400 text-center">
                  +{paretoFrontier.length - 10} more solutions
                </div>
              )}
              {selectedSolution && onApplySolution && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <Button onClick={handleApplySolution} fullWidth className="text-xs">
                    <CheckCircle size={14} className="mr-2" />
                    Apply Solution
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-xs text-center mt-20">
              {isOptimizing ? 'Finding solutions...' : 'No solutions found yet.'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
