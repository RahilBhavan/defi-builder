/**
 * Backtest Visualization Component for Optimization
 * Displays equity curves and metrics for optimization solutions
 */

import { TrendingUp } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DeFiBacktestResult } from '../../services/defiBacktestEngine';
import type { OptimizationSolution } from '../../services/optimization/types';

interface BacktestVisualizationProps {
  solutions: OptimizationSolution[];
  selectedSolutionId?: string | null;
  onSelectSolution?: (solutionId: string) => void;
  initialCapital: number;
}

type ViewMode = 'single' | 'compare' | 'all';

export const BacktestVisualization: React.FC<BacktestVisualizationProps> = ({
  solutions,
  selectedSolutionId,
  onSelectSolution,
  initialCapital,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedSolutions, setSelectedSolutions] = useState<Set<string>>(
    selectedSolutionId ? new Set([selectedSolutionId]) : new Set()
  );

  // Filter solutions with backtest results
  const solutionsWithBacktests = useMemo(
    () =>
      solutions.filter(
        (s) => s.backtestResult?.equityCurve && s.backtestResult.equityCurve.length > 0
      ),
    [solutions]
  );

  // Get selected solution
  const selectedSolution = useMemo(
    () => solutionsWithBacktests.find((s) => s.id === selectedSolutionId),
    [solutionsWithBacktests, selectedSolutionId]
  );

  // Prepare chart data for single view
  const singleChartData = useMemo(() => {
    if (!selectedSolution?.backtestResult?.equityCurve) return [];

    // Validate and filter data
    const validCurve = selectedSolution.backtestResult.equityCurve.filter(
      (point) =>
        point.date &&
        point.equity !== undefined &&
        !isNaN(point.equity) &&
        isFinite(point.equity) &&
        !isNaN(new Date(point.date).getTime())
    );

    if (validCurve.length === 0) return [];

    // Sample if too large
    const shouldSample = validCurve.length > 1000;
    const dataToProcess = shouldSample
      ? validCurve.filter((_, index) => index % Math.ceil(validCurve.length / 1000) === 0)
      : validCurve;

    return dataToProcess
      .map((point) => {
        try {
          const date = new Date(point.date);
          if (isNaN(date.getTime())) return null;
          const equity = Number(point.equity);
          return {
            date: point.date,
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            equity,
            return: ((equity - initialCapital) / initialCapital) * 100,
          };
        } catch {
          return null;
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
  }, [selectedSolution, initialCapital]);

  // Prepare chart data for comparison view
  const compareChartData = useMemo(() => {
    if (viewMode !== 'compare' || selectedSolutions.size === 0) return [];

    const selected = solutionsWithBacktests.filter((s) => selectedSolutions.has(s.id));
    if (selected.length === 0) return [];

    // Find the longest valid equity curve to use as base
    const longestCurve = selected.reduce((longest, current) => {
      const currentCurve =
        current.backtestResult?.equityCurve?.filter(
          (p) => p.date && p.equity !== undefined && !isNaN(p.equity) && isFinite(p.equity)
        ) || [];
      const longestCurve =
        longest.backtestResult?.equityCurve?.filter(
          (p) => p.date && p.equity !== undefined && !isNaN(p.equity) && isFinite(p.equity)
        ) || [];
      return currentCurve.length > longestCurve.length ? current : longest;
    }, selected[0]);

    if (!longestCurve?.backtestResult?.equityCurve) return [];

    // Validate and align dates across all solutions
    const validBaseCurve = longestCurve.backtestResult.equityCurve.filter(
      (p) =>
        p.date &&
        p.equity !== undefined &&
        !isNaN(p.equity) &&
        isFinite(p.equity) &&
        !isNaN(new Date(p.date).getTime())
    );

    if (validBaseCurve.length === 0) return [];

    // Sample if too large
    const shouldSample = validBaseCurve.length > 1000;
    const dataToProcess = shouldSample
      ? validBaseCurve.filter((_, index) => index % Math.ceil(validBaseCurve.length / 1000) === 0)
      : validBaseCurve;

    // Create data points for all selected solutions
    return dataToProcess
      .map((point, index) => {
        try {
          const date = new Date(point.date);
          if (isNaN(date.getTime())) return null;

          const dataPoint: Record<string, string | number> = {
            date: point.date,
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };

          // Add equity for each selected solution, aligning by date
          for (const solution of selected) {
            if (solution.backtestResult?.equityCurve) {
              // Find closest matching point by date
              const solutionPoint =
                solution.backtestResult.equityCurve.find(
                  (p) => Math.abs(new Date(p.date).getTime() - date.getTime()) < 24 * 60 * 60 * 1000 // within 1 day
                ) || solution.backtestResult.equityCurve[index];

              if (
                solutionPoint &&
                solutionPoint.equity !== undefined &&
                !isNaN(solutionPoint.equity) &&
                isFinite(solutionPoint.equity)
              ) {
                const equity = Number(solutionPoint.equity);
                dataPoint[`${solution.id}-equity`] = equity;
                dataPoint[`${solution.id}-return`] =
                  ((equity - initialCapital) / initialCapital) * 100;
              }
            }
          }

          return dataPoint;
        } catch {
          return null;
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
  }, [viewMode, selectedSolutions, solutionsWithBacktests, initialCapital]);

  // Prepare chart data for all solutions view (show top N)
  const allChartData = useMemo(() => {
    if (viewMode !== 'all') return [];

    // Show top 5 solutions by Sharpe ratio
    const topSolutions = [...solutionsWithBacktests]
      .sort(
        (a, b) => (b.outOfSampleScores.sharpeRatio || 0) - (a.outOfSampleScores.sharpeRatio || 0)
      )
      .slice(0, 5);

    if (topSolutions.length === 0) return [];

    // Find longest valid curve
    const longestCurve = topSolutions.reduce((longest, current) => {
      const currentCurve =
        current.backtestResult?.equityCurve?.filter(
          (p) => p.date && p.equity !== undefined && !isNaN(p.equity) && isFinite(p.equity)
        ) || [];
      const longestCurve =
        longest.backtestResult?.equityCurve?.filter(
          (p) => p.date && p.equity !== undefined && !isNaN(p.equity) && isFinite(p.equity)
        ) || [];
      return currentCurve.length > longestCurve.length ? current : longest;
    }, topSolutions[0]);

    if (!longestCurve?.backtestResult?.equityCurve) return [];

    const validBaseCurve = longestCurve.backtestResult.equityCurve.filter(
      (p) =>
        p.date &&
        p.equity !== undefined &&
        !isNaN(p.equity) &&
        isFinite(p.equity) &&
        !isNaN(new Date(p.date).getTime())
    );

    if (validBaseCurve.length === 0) return [];

    // Sample if too large
    const shouldSample = validBaseCurve.length > 1000;
    const dataToProcess = shouldSample
      ? validBaseCurve.filter((_, index) => index % Math.ceil(validBaseCurve.length / 1000) === 0)
      : validBaseCurve;

    return dataToProcess
      .map((point, index) => {
        try {
          const date = new Date(point.date);
          if (isNaN(date.getTime())) return null;

          const dataPoint: Record<string, string | number> = {
            date: point.date,
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };

          for (const solution of topSolutions) {
            if (solution.backtestResult?.equityCurve) {
              const curvePoint =
                solution.backtestResult.equityCurve[index] ||
                solution.backtestResult.equityCurve.find(
                  (p) => Math.abs(new Date(p.date).getTime() - date.getTime()) < 24 * 60 * 60 * 1000
                );
              if (
                curvePoint &&
                curvePoint.equity !== undefined &&
                !isNaN(curvePoint.equity) &&
                isFinite(curvePoint.equity)
              ) {
                dataPoint[`solution-${solution.id}`] = Number(curvePoint.equity);
              }
            }
          }

          return dataPoint;
        } catch {
          return null;
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
  }, [viewMode, solutionsWithBacktests]);

  // Color palette for multiple solutions
  const colors = [
    '#FF5500', // Orange
    '#00D395', // Green
    '#3465A4', // Blue
    '#9B59B6', // Purple
    '#FF007A', // Pink
    '#B6509E', // Aave Purple
  ];

  if (solutionsWithBacktests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm font-mono uppercase">No backtest data available</p>
          <p className="text-xs text-gray-500 mt-2">
            Backtest results will appear here once optimization completes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* View Mode Selector */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
        <button
          onClick={() => setViewMode('single')}
          className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border-b-2 ${
            viewMode === 'single'
              ? 'border-orange text-ink'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          Single
        </button>
        <button
          onClick={() => setViewMode('compare')}
          className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border-b-2 ${
            viewMode === 'compare'
              ? 'border-orange text-ink'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          Compare
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border-b-2 ${
            viewMode === 'all'
              ? 'border-orange text-ink'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          Top 5
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {viewMode === 'single' && selectedSolution ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={singleChartData}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF5500" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF5500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                label={{
                  value: 'Equity ($)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontFamily: 'IBM Plex Mono', fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #000',
                  borderRadius: '0px',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: '11px',
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  'Equity',
                ]}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#FF5500"
                strokeWidth={2}
                fill="url(#equityGradient)"
                name="Equity"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : viewMode === 'compare' && compareChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compareChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                label={{
                  value: 'Equity ($)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontFamily: 'IBM Plex Mono', fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #000',
                  borderRadius: '0px',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '11px' }} />
              {Array.from(selectedSolutions).map((solutionId, index) => {
                const solution = solutionsWithBacktests.find((s) => s.id === solutionId);
                if (!solution) return null;
                return (
                  <Line
                    key={solutionId}
                    type="monotone"
                    dataKey={`${solutionId}-equity`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={`Solution ${solutionsWithBacktests.indexOf(solution) + 1}`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : viewMode === 'all' && allChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={allChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                label={{
                  value: 'Equity ($)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontFamily: 'IBM Plex Mono', fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #000',
                  borderRadius: '0px',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '11px' }} />
              {solutionsWithBacktests
                .sort(
                  (a, b) =>
                    (b.outOfSampleScores.sharpeRatio || 0) - (a.outOfSampleScores.sharpeRatio || 0)
                )
                .slice(0, 5)
                .map((solution, index) => (
                  <Line
                    key={solution.id}
                    type="monotone"
                    dataKey={`solution-${solution.id}`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={`#${index + 1} (Sharpe: ${(solution.outOfSampleScores.sharpeRatio || 0).toFixed(2)})`}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm font-mono uppercase">Select solutions to compare</p>
          </div>
        )}
      </div>

      {/* Solution Selector for Compare Mode */}
      {viewMode === 'compare' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">
            Select Solutions to Compare
          </p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {solutionsWithBacktests.map((solution, index) => {
              const isSelected = selectedSolutions.has(solution.id);
              return (
                <button
                  key={solution.id}
                  onClick={() => {
                    const newSelected = new Set(selectedSolutions);
                    if (isSelected) {
                      newSelected.delete(solution.id);
                    } else {
                      newSelected.add(solution.id);
                    }
                    setSelectedSolutions(newSelected);
                    if (onSelectSolution && newSelected.size === 1) {
                      onSelectSolution(Array.from(newSelected)[0] || '');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-mono border transition-all ${
                    isSelected
                      ? 'bg-orange/10 border-orange text-ink'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  #{index + 1} (Sharpe: {(solution.outOfSampleScores.sharpeRatio || 0).toFixed(2)})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Summary */}
      {viewMode === 'single' && selectedSolution?.backtestResult && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500">Total Return:</span>
              <span className="ml-2 font-bold text-ink">
                {((selectedSolution.backtestResult.metrics.totalReturn || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Sharpe Ratio:</span>
              <span className="ml-2 font-bold text-ink">
                {(selectedSolution.outOfSampleScores.sharpeRatio || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Max Drawdown:</span>
              <span className="ml-2 font-bold text-ink">
                {((selectedSolution.backtestResult.metrics.maxDrawdown || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Win Rate:</span>
              <span className="ml-2 font-bold text-ink">
                {selectedSolution.backtestResult.metrics.totalTrades > 0
                  ? (
                      (selectedSolution.backtestResult.metrics.winTrades /
                        selectedSolution.backtestResult.metrics.totalTrades) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                %
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
