import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../ui/Button';
import { DeFiBacktestResult } from '../../services/defiBacktestEngine';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeFiBacktestResult | null;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen) return null;

  const chartData = useMemo(() => {
    if (!result?.equityCurve || result.equityCurve.length === 0) {
      // Generate placeholder data if no equity curve
      return Array.from({ length: 30 }, (_, i) => ({
        name: `Day ${i + 1}`,
        value: 10000 + (i * 100),
      }));
    }
    return result.equityCurve.map((point, index) => ({
      name: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.equity,
    }));
  }, [result]);

  const metrics = result?.metrics || {
    sharpeRatio: 0,
    totalReturn: 0,
    maxDrawdown: 0,
    winTrades: 0,
    totalTrades: 0,
    totalGasSpent: 0,
    totalFeesSpent: 0,
  };

  const winRate = metrics.totalTrades > 0 
    ? ((metrics.winTrades / metrics.totalTrades) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-canvas w-full max-w-5xl h-[80vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
            <h2 className="text-lg font-bold font-mono uppercase">Backtest Results</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            {!result ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                        <p className="text-sm font-mono text-gray-500 uppercase">Running Backtest...</p>
                    </div>
                </div>
            ) : (
            <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Stats */}
                <div className="w-full md:w-1/4 space-y-6">
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Return</div>
                        <div className={`text-3xl font-mono font-bold ${metrics.totalReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}>
                            {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
                        </div>
                    </div>
                     <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Max Drawdown</div>
                        <div className="text-3xl font-mono text-alert-red font-bold">{metrics.maxDrawdown.toFixed(2)}%</div>
                    </div>
                     <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sharpe Ratio</div>
                        <div className="text-3xl font-mono text-ink font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Win Rate</div>
                        <div className="text-3xl font-mono text-ink font-bold">{winRate}%</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Trades</div>
                        <div className="text-3xl font-mono text-ink font-bold">{metrics.totalTrades}</div>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-200">
                        <Button fullWidth>Export CSV</Button>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 h-[400px] border border-gray-300 bg-white p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="name" tick={{fontFamily: 'IBM Plex Mono', fontSize: 12}} />
                            <YAxis tick={{fontFamily: 'IBM Plex Mono', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #000', 
                                    borderRadius: '0px',
                                    fontFamily: 'IBM Plex Mono'
                                }} 
                            />
                            <Area type="monotone" dataKey="value" stroke="#00D395" fill="#00D395" fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};
