/**
 * Solution Comparison Component
 * Table comparing multiple optimization solutions
 */

import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import type {
  OptimizationObjective,
  OptimizationSolution,
} from '../../services/optimization/types';

interface SolutionComparisonProps {
  solutions: OptimizationSolution[];
  objectives: OptimizationObjective[];
  selectedSolutionId: string | null;
  onSelectSolution: (solution: OptimizationSolution) => void;
}

export const SolutionComparison: React.FC<SolutionComparisonProps> = ({
  solutions,
  objectives,
  selectedSolutionId,
  onSelectSolution,
}) => {
  const [sortBy, setSortBy] = useState<{ field: string; ascending: boolean } | null>(null);
  const [expandedSolution, setExpandedSolution] = useState<string | null>(null);

  const sortedSolutions = React.useMemo(() => {
    if (!sortBy) return solutions;

    const sorted = [...solutions].sort((a, b) => {
      const aValue = a.outOfSampleScores[sortBy.field as OptimizationObjective] ?? 0;
      const bValue = b.outOfSampleScores[sortBy.field as OptimizationObjective] ?? 0;

      // For maxDrawdown, lower is better (invert)
      const comparison = sortBy.field === 'maxDrawdown' ? bValue - aValue : aValue - bValue;

      return sortBy.ascending ? comparison : -comparison;
    });

    return sorted;
  }, [solutions, sortBy]);

  const handleSort = (field: string) => {
    if (sortBy?.field === field) {
      setSortBy({ field, ascending: !sortBy.ascending });
    } else {
      setSortBy({ field, ascending: true });
    }
  };

  if (solutions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm font-mono uppercase">No solutions to compare</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-bold uppercase text-ink w-12">Select</th>
              <th className="px-4 py-3 text-left font-bold uppercase text-ink">Solution</th>
              {objectives.map((obj) => (
                <th
                  key={obj}
                  className="px-4 py-3 text-right font-bold uppercase text-ink cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(obj)}
                >
                  <div className="flex items-center justify-end gap-2">
                    {obj.replace(/([A-Z])/g, ' $1').trim()}
                    {sortBy?.field === obj &&
                      (sortBy.ascending ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-bold uppercase text-ink">Degradation</th>
              <th className="px-4 py-3 text-right font-bold uppercase text-ink w-12">Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedSolutions.map((solution, index) => {
              const isSelected = solution.id === selectedSolutionId;
              const isExpanded = expandedSolution === solution.id;

              return (
                <React.Fragment key={solution.id}>
                  <tr
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-orange/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSelectSolution(solution)}
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-orange bg-orange text-white'
                            : 'border-gray-300 hover:border-orange'
                        }`}
                      >
                        {isSelected && <CheckCircle size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Solution #{index + 1}
                      {solution.isParetoOptimal && (
                        <span className="ml-2 text-[10px] bg-orange text-white px-2 py-0.5">
                          PARETO
                        </span>
                      )}
                    </td>
                    {objectives.map((obj) => {
                      const value = solution.outOfSampleScores[obj];
                      const isBest = sortedSolutions[0]?.outOfSampleScores[obj] === value;
                      return (
                        <td
                          key={obj}
                          className={`px-4 py-3 text-right ${
                            isBest ? 'font-bold text-orange' : 'text-gray-600'
                          }`}
                        >
                          {value !== undefined ? value.toFixed(4) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-gray-600">
                      {solution.degradation.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedSolution(isExpanded ? null : solution.id)}
                        className="text-gray-400 hover:text-ink transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={objectives.length + 4} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-gray-500 mb-2">
                              Parameters
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
                              {Object.entries(solution.parameters).map(([blockId, params]) => (
                                <div key={blockId} className="bg-white p-2 border border-gray-200">
                                  <div className="font-bold text-gray-700 mb-1">
                                    {blockId.slice(0, 8)}...
                                  </div>
                                  {Object.entries(params).map(([param, value]) => (
                                    <div key={param} className="text-gray-600">
                                      {param}:{' '}
                                      {typeof value === 'number' ? value.toFixed(4) : value}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          {solution.backtestResult && (
                            <div>
                              <div className="text-[10px] font-bold uppercase text-gray-500 mb-2">
                                Backtest Metrics
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] bg-white p-2 border border-gray-200">
                                <div>
                                  <span className="text-gray-500">Return:</span>{' '}
                                  <span className="font-bold">
                                    {solution.backtestResult.metrics.totalReturn.toFixed(2)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Sharpe:</span>{' '}
                                  <span className="font-bold">
                                    {solution.backtestResult.metrics.sharpeRatio.toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Drawdown:</span>{' '}
                                  <span className="font-bold">
                                    {solution.backtestResult.metrics.maxDrawdown.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
