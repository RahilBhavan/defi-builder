import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Sliders, Activity, Zap } from 'lucide-react';
import { 
  OptimizationAlgorithm, 
  OptimizationObjective,
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
  OptimizationSolution,
  optimizationEngine,
} from '../services/optimization';
import { parameterExtractor } from '../services/optimization/parameterExtractor';
import { LegoBlock } from '../types';
import { Button } from './ui/Button';

interface OptimizationPanelProps {
  onClose: () => void;
  isOpen: boolean;
  blocks: LegoBlock[];
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ onClose, isOpen, blocks }) => {
  const [algorithm, setAlgorithm] = useState<OptimizationAlgorithm>('bayesian');
  const [objectives, setObjectives] = useState<OptimizationObjective[]>(['sharpeRatio', 'maxDrawdown']);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [paretoFrontier, setParetoFrontier] = useState<OptimizationSolution[]>([]);

  const handleObjectiveToggle = (objective: OptimizationObjective) => {
    if (objectives.includes(objective)) {
      if (objectives.length > 2) {
        setObjectives(objectives.filter(o => o !== objective));
      }
    } else {
      setObjectives([...objectives, objective]);
    }
  };

  const handleStartOptimization = useCallback(async () => {
    if (blocks.length === 0) {
      alert('Please add blocks to your strategy before optimizing');
      return;
    }

    setIsOptimizing(true);
    setProgress(null);
    setResult(null);
    setParetoFrontier([]);

    try {
      // Extract optimizable parameters from blocks
      const parameters = parameterExtractor.extract(blocks);
      
      if (parameters.length === 0) {
        alert('No optimizable parameters found in current blocks');
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
        }
      );

      setResult(optimizationResult);
      setParetoFrontier(optimizationResult.paretoFrontier);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please check the console for details.');
    } finally {
      setIsOptimizing(false);
    }
  }, [blocks, algorithm, objectives]);

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
                <label className={`block p-4 border cursor-pointer transition-all ${algorithm === 'bayesian' ? 'bg-white border-orange shadow-sm' : 'border-gray-300 hover:border-gray-400'}`}>
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

                <label className={`block p-4 border cursor-pointer transition-all ${algorithm === 'genetic' ? 'bg-white border-orange shadow-sm' : 'border-gray-300 hover:border-gray-400'}`}>
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

            {/* Objectives */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-ink font-bold font-mono text-sm uppercase">
                <Activity size={16} />
                Objectives (Min 2)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(['sharpeRatio', 'totalReturn', 'maxDrawdown', 'winRate', 'gasCosts'] as OptimizationObjective[]).map(
                  (objective) => (
                    <label key={objective} className="flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors">
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
                  )
                )}
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
        <div className="flex-1 bg-white p-8 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
            <div className="relative z-10 text-center w-full">
                {isOptimizing && progress ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto"/>
                        <p className="font-mono text-sm text-gray-500 uppercase animate-pulse">
                          Running Simulation...
                        </p>
                        <div className="mt-4 space-y-2">
                          <p className="font-mono text-xs text-gray-400">
                            Iteration {progress.iteration} / {progress.maxIterations}
                          </p>
                          <div className="w-64 h-2 bg-gray-200 mx-auto">
                            <div 
                              className="h-full bg-orange transition-all"
                              style={{ width: `${(progress.iteration / progress.maxIterations) * 100}%` }}
                            />
                          </div>
                          {progress.estimatedTimeRemaining > 0 && (
                            <p className="font-mono text-xs text-gray-400">
                              ~{Math.ceil(progress.estimatedTimeRemaining / 60)} min remaining
                            </p>
                          )}
                        </div>
                    </div>
                ) : result ? (
                    <div className="space-y-4">
                        <p className="font-mono text-sm text-ink uppercase font-bold">
                          Optimization Complete
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          Found {result.paretoFrontier.length} Pareto-optimal solutions
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          Total time: {Math.round(result.totalTime)}s | Iterations: {result.totalIterations}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 opacity-40">
                         <Play size={64} className="mx-auto text-gray-400" />
                         <p className="font-mono text-sm text-gray-500 uppercase">Configure and start optimization to view Pareto Frontier</p>
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
              {paretoFrontier.slice(0, 10).map((solution, idx) => (
                <div key={solution.id} className="bg-white border border-gray-200 p-3">
                  <div className="text-xs font-bold text-ink mb-2">Solution #{idx + 1}</div>
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
                      <div className="text-gray-400">Degradation: {solution.degradation.toFixed(1)}%</div>
                    )}
                  </div>
                </div>
              ))}
              {paretoFrontier.length > 10 && (
                <div className="text-xs text-gray-400 text-center">
                  +{paretoFrontier.length - 10} more solutions
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
