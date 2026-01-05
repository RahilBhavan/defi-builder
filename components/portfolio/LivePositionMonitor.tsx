/**
 * Live Position Monitor
 * Real-time position tracking with P&L updates
 */

import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from 'lucide-react';
import type React from 'react';
import { usePositionMonitor } from '../../hooks/usePositionMonitor';
import { useWebSocketStatus } from '../../hooks/usePriceFeed';
import { ConnectionStatus } from '../ui/ConnectionStatus';

export interface Position {
  asset: string;
  amount: number;
  entryPrice: number;
  entryValue: number;
  strategyId?: string;
  timestamp?: number;
}

interface LivePositionMonitorProps {
  positions: Position[];
  className?: string;
}

export const LivePositionMonitor: React.FC<LivePositionMonitorProps> = ({
  positions,
  className = '',
}) => {
  const connectionStatus = useWebSocketStatus();
  const {
    positions: positionsWithPnL,
    totalPnL,
    totalPnLPercent,
    totalValue,
    isLoading,
  } = usePositionMonitor(positions);

  if (positions.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="font-mono text-sm">No active positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold font-mono uppercase">Live Positions</h3>
        <ConnectionStatus showLabel={false} />
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-8 bg-gray-200 rounded mb-1" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="bg-gray-50 p-4 rounded animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-xs text-gray-500 uppercase mb-1">Total P&L</div>
            <div
              className={`text-2xl font-bold font-mono ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}$
              {totalPnL.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`text-sm font-mono ${
                totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalPnLPercent >= 0 ? '+' : ''}
              {totalPnLPercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Value</div>
            <div className="text-2xl font-bold font-mono text-ink">
              $
              {totalValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      )}

      {/* Positions List */}
      <div className="space-y-3">
        {positionsWithPnL.map((position) => (
          <div
            key={position.asset}
            className="border border-gray-200 p-4 rounded hover:border-orange transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">{position.asset}</span>
                {position.isProfit ? (
                  <TrendingUp size={16} className="text-green-600" />
                ) : (
                  <TrendingDown size={16} className="text-red-600" />
                )}
              </div>
              <div className="text-right">
                <div
                  className={`font-bold font-mono ${
                    position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {position.pnl >= 0 ? '+' : ''}$
                  {position.pnl.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={`text-xs font-mono ${
                    position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {position.pnlPercent >= 0 ? '+' : ''}
                  {position.pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <div className="text-gray-400 uppercase mb-1">Amount</div>
                <div className="font-mono font-bold">{position.amount.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-gray-400 uppercase mb-1">Entry</div>
                <div className="font-mono font-bold">${position.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400 uppercase mb-1">Current</div>
                <div className="font-mono font-bold">
                  ${position.currentPrice > 0 ? position.currentPrice.toFixed(2) : '--'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
