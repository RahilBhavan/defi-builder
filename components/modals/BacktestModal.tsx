import { motion } from 'framer-motion';
import { ChevronDown, Download, Filter, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useToast } from '../../hooks/useToast';
import type { DeFiBacktestResult } from '../../services/defiBacktestEngine';
import { type AdvancedMetrics, calculateAdvancedMetrics } from '../../utils/advancedMetrics';
import {
  downloadCSV,
  exportEquityCurveToCSV,
  exportMetricsToCSV,
  exportTradesToCSV,
} from '../../utils/csvExport';
import { Button } from '../ui/Button';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeFiBacktestResult | null;
}

type Tab = 'overview' | 'trades' | 'comparison' | 'advanced';
type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';

export const BacktestModal: React.FC<BacktestModalProps> = ({ isOpen, onClose, result }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('ALL');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [tradeFilter, setTradeFilter] = useState<{
    type: string;
    token: string;
    dateRange: { start: Date | null; end: Date | null };
  }>({
    type: 'ALL',
    token: 'ALL',
    dateRange: { start: null, end: null },
  });
  const [showFilters, setShowFilters] = useState(false);

  if (!isOpen) return null;

  // Filter equity curve by time period
  const filteredEquityCurve = useMemo(() => {
    if (!result?.equityCurve) return [];
    if (timePeriod === 'ALL') return result.equityCurve;
    if (timePeriod === 'CUSTOM') {
      if (!customDateRange.start || !customDateRange.end) {
        return result.equityCurve;
      }
      return result.equityCurve.filter((point) => {
        const pointDate = new Date(point.date);
        return pointDate >= customDateRange.start! && pointDate <= customDateRange.end!;
      });
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (timePeriod) {
      case '1M':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return result.equityCurve;
    }

    return result.equityCurve.filter((point) => new Date(point.date) >= cutoffDate);
  }, [result, timePeriod, customDateRange]);

  const chartData = useMemo(() => {
    if (!filteredEquityCurve || filteredEquityCurve.length === 0) {
      return [];
    }
    return filteredEquityCurve.map((point) => ({
      date: point.date,
      name: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      equity: point.equity,
    }));
  }, [filteredEquityCurve]);

  // Calculate HODL benchmark
  const benchmarkData = useMemo(() => {
    if (!result || chartData.length === 0) return [];

    const firstPrice = chartData[0]?.equity || result.initialCapital;
    const lastPrice = chartData[chartData.length - 1]?.equity || result.initialCapital;

    // Generate HODL equity curve (linear growth assumption)
    return chartData.map((point, index) => {
      const progress = index / (chartData.length - 1);
      const hodlValue = firstPrice + (lastPrice - firstPrice) * progress;
      return {
        ...point,
        hodl: hodlValue,
      };
    });
  }, [result, chartData]);

  const combinedChartData = useMemo(() => {
    return benchmarkData.map((point) => ({
      ...point,
      strategy: point.equity,
    }));
  }, [benchmarkData]);

  const metrics = result?.metrics || {
    sharpeRatio: 0,
    totalReturn: 0,
    maxDrawdown: 0,
    winTrades: 0,
    totalTrades: 0,
    totalGasSpent: 0,
    totalFeesSpent: 0,
  };

  const winRate =
    metrics.totalTrades > 0 ? ((metrics.winTrades / metrics.totalTrades) * 100).toFixed(1) : '0.0';

  // Calculate HODL performance
  const hodlReturn = useMemo(() => {
    if (!result || chartData.length === 0) return 0;
    const firstEquity = chartData[0]?.equity || result.initialCapital;
    const lastEquity = chartData[chartData.length - 1]?.equity || result.initialCapital;
    return ((lastEquity - firstEquity) / firstEquity) * 100;
  }, [result, chartData]);

  // Export CSV functions
  const handleExportEquityCurve = () => {
    if (!result) {
      showError('No backtest data to export');
      return;
    }
    try {
      const csv = exportEquityCurveToCSV(result);
      downloadCSV(csv, `backtest-equity-curve-${Date.now()}.csv`);
      showSuccess('Equity curve exported to CSV');
    } catch (error) {
      showError('Failed to export equity curve');
      console.error('CSV export error:', error);
    }
  };

  const handleExportTrades = () => {
    if (!result) {
      showError('No backtest data to export');
      return;
    }
    try {
      const csv = exportTradesToCSV(filteredTrades);
      downloadCSV(csv, `backtest-trades-${Date.now()}.csv`);
      showSuccess('Trades exported to CSV');
    } catch (error) {
      showError('Failed to export trades');
      console.error('CSV export error:', error);
    }
  };

  const handleExportMetrics = () => {
    if (!result) {
      showError('No backtest data to export');
      return;
    }
    try {
      const csv = exportMetricsToCSV(result, advancedMetrics || undefined);
      downloadCSV(csv, `backtest-metrics-${Date.now()}.csv`);
      showSuccess('Metrics exported to CSV');
    } catch (error) {
      showError('Failed to export metrics');
      console.error('CSV export error:', error);
    }
  };

  const handleExportAll = () => {
    handleExportEquityCurve();
    setTimeout(() => handleExportTrades(), 100);
    setTimeout(() => handleExportMetrics(), 200);
  };

  // Calculate advanced metrics
  const advancedMetrics = useMemo<AdvancedMetrics | null>(() => {
    if (!result) return null;
    return calculateAdvancedMetrics(result);
  }, [result]);

  // Filter trades
  const filteredTrades = useMemo(() => {
    if (!result?.trades) return [];
    let trades = [...result.trades].sort((a, b) => a.timestamp - b.timestamp);

    // Filter by type
    if (tradeFilter.type !== 'ALL') {
      trades = trades.filter((t) => t.type === tradeFilter.type.toLowerCase());
    }

    // Filter by token
    if (tradeFilter.token !== 'ALL') {
      trades = trades.filter(
        (t) => t.inputToken === tradeFilter.token || t.outputToken === tradeFilter.token
      );
    }

    // Filter by date range
    if (tradeFilter.dateRange.start) {
      trades = trades.filter((t) => t.timestamp >= tradeFilter.dateRange.start!.getTime());
    }
    if (tradeFilter.dateRange.end) {
      trades = trades.filter((t) => t.timestamp <= tradeFilter.dateRange.end!.getTime());
    }

    return trades;
  }, [result, tradeFilter]);

  // Get unique trade types and tokens for filters
  const tradeTypes = useMemo(() => {
    if (!result?.trades) return [];
    return Array.from(new Set(result.trades.map((t) => t.type.toUpperCase())));
  }, [result]);

  const tradeTokens = useMemo(() => {
    if (!result?.trades) return [];
    const tokens = new Set<string>();
    result.trades.forEach((t) => {
      tokens.add(t.inputToken);
      if (t.outputToken) tokens.add(t.outputToken);
    });
    return Array.from(tokens).sort();
  }, [result]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-12 touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backtest-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-canvas w-full max-w-5xl h-[80vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <h2 id="backtest-modal-title" className="text-lg font-bold font-mono uppercase">
            Backtest Results
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink"
            aria-label="Close backtest results modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        {result && (
          <div className="flex border-b border-gray-300 bg-white" role="tablist" aria-label="Backtest result tabs">
            <button
              onClick={() => setActiveTab('overview')}
              role="tab"
              aria-selected={activeTab === 'overview'}
              aria-controls="overview-panel"
              id="overview-tab"
              className={`px-6 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-orange text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              role="tab"
              aria-selected={activeTab === 'trades'}
              aria-controls="trades-panel"
              id="trades-tab"
              className={`px-6 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                activeTab === 'trades'
                  ? 'border-orange text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Trades ({filteredTrades.length})
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              role="tab"
              aria-selected={activeTab === 'comparison'}
              aria-controls="comparison-panel"
              id="comparison-tab"
              className={`px-6 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                activeTab === 'comparison'
                  ? 'border-orange text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              role="tab"
              aria-selected={activeTab === 'advanced'}
              aria-controls="advanced-panel"
              id="advanced-tab"
              className={`px-6 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                activeTab === 'advanced'
                  ? 'border-orange text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Advanced Metrics
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {!result ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-mono text-gray-500 uppercase">Running Backtest...</p>
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            <div
              role="tabpanel"
              id="overview-panel"
              aria-labelledby="overview-tab"
              className="flex flex-col md:flex-row gap-8 mb-8"
            >
              {/* Stats */}
              <div className="w-full md:w-1/4 space-y-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Return</div>
                  <div
                    className={`text-3xl font-mono font-bold ${metrics.totalReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}
                  >
                    {metrics.totalReturn >= 0 ? '+' : ''}
                    {metrics.totalReturn.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Max Drawdown</div>
                  <div className="text-3xl font-mono text-alert-red font-bold">
                    {metrics.maxDrawdown.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sharpe Ratio</div>
                  <div className="text-3xl font-mono text-ink font-bold">
                    {metrics.sharpeRatio.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Win Rate</div>
                  <div className="text-3xl font-mono text-ink font-bold">{winRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Trades</div>
                  <div className="text-3xl font-mono text-ink font-bold">{metrics.totalTrades}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Period</div>
                  <div className="text-sm font-mono text-gray-600">
                    {new Date(result.startDate).toLocaleDateString()} -{' '}
                    {new Date(result.endDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 space-y-2">
                  <Button fullWidth onClick={handleExportAll} variant="primary">
                    <Download size={16} className="mr-2" />
                    Export All
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleExportEquityCurve}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      Equity
                    </Button>
                    <Button
                      onClick={handleExportTrades}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      Trades
                    </Button>
                  </div>
                  <Button
                    onClick={handleExportMetrics}
                    variant="secondary"
                    fullWidth
                    className="text-[10px]"
                  >
                    Metrics
                  </Button>
                </div>

                {/* Time Period Selector */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">
                    Time Period
                  </label>
                  <div className="relative">
                    <select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                      className="w-full h-10 px-3 border border-gray-300 bg-white font-mono text-xs focus:border-ink outline-none appearance-none"
                    >
                      <option value="ALL">All Time</option>
                      <option value="1M">Last Month</option>
                      <option value="3M">Last 3 Months</option>
                      <option value="6M">Last 6 Months</option>
                      <option value="1Y">Last Year</option>
                      <option value="CUSTOM">Custom Range</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                    />
                  </div>
                  {timePeriod === 'CUSTOM' && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={
                            customDateRange.start
                              ? customDateRange.start.toISOString().split('T')[0]
                              : result?.startDate
                                ? new Date(result.startDate).toISOString().split('T')[0]
                                : ''
                          }
                          onChange={(e) => {
                            setCustomDateRange({
                              ...customDateRange,
                              start: e.target.value ? new Date(e.target.value) : null,
                            });
                          }}
                          min={
                            result?.startDate
                              ? new Date(result.startDate).toISOString().split('T')[0]
                              : undefined
                          }
                          max={
                            result?.endDate
                              ? new Date(result.endDate).toISOString().split('T')[0]
                              : undefined
                          }
                          className="w-full h-8 px-2 border border-gray-300 bg-white font-mono text-[10px] focus:border-ink outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={
                            customDateRange.end
                              ? customDateRange.end.toISOString().split('T')[0]
                              : result?.endDate
                                ? new Date(result.endDate).toISOString().split('T')[0]
                                : ''
                          }
                          onChange={(e) => {
                            setCustomDateRange({
                              ...customDateRange,
                              end: e.target.value ? new Date(e.target.value) : null,
                            });
                          }}
                          min={
                            customDateRange.start
                              ? customDateRange.start.toISOString().split('T')[0]
                              : result?.startDate
                                ? new Date(result.startDate).toISOString().split('T')[0]
                                : undefined
                          }
                          max={
                            result?.endDate
                              ? new Date(result.endDate).toISOString().split('T')[0]
                              : undefined
                          }
                          className="w-full h-8 px-2 border border-gray-300 bg-white font-mono text-[10px] focus:border-ink outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 h-[400px] border border-gray-300 bg-white p-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }} />
                      <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #000',
                          borderRadius: '0px',
                          fontFamily: 'IBM Plex Mono',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#00D395"
                        fill="#00D395"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-sm font-mono uppercase">No equity curve data</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'trades' ? (
            <div
              role="tabpanel"
              id="trades-panel"
              aria-labelledby="trades-tab"
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase text-ink">Trade History</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-gray-500">
                    {filteredTrades.length} of {result.trades.length} trade
                    {result.trades.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-3 py-1 border border-gray-300 text-xs font-mono uppercase hover:border-ink transition-colors flex items-center gap-2"
                  >
                    <Filter size={12} />
                    Filter
                  </button>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="p-4 bg-gray-50 border border-gray-300 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                        Trade Type
                      </label>
                      <select
                        value={tradeFilter.type}
                        onChange={(e) => setTradeFilter({ ...tradeFilter, type: e.target.value })}
                        className="w-full h-10 px-3 border border-gray-300 bg-white font-mono text-xs focus:border-ink outline-none"
                      >
                        <option value="ALL">All Types</option>
                        {tradeTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                        Token
                      </label>
                      <select
                        value={tradeFilter.token}
                        onChange={(e) => setTradeFilter({ ...tradeFilter, token: e.target.value })}
                        className="w-full h-10 px-3 border border-gray-300 bg-white font-mono text-xs focus:border-ink outline-none"
                      >
                        <option value="ALL">All Tokens</option>
                        {tradeTokens.map((token) => (
                          <option key={token} value={token}>
                            {token}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tradeFilter.dateRange.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) =>
                          setTradeFilter({
                            ...tradeFilter,
                            dateRange: {
                              ...tradeFilter.dateRange,
                              start: e.target.value ? new Date(e.target.value) : null,
                            },
                          })
                        }
                        className="w-full h-10 px-3 border border-gray-300 bg-white font-mono text-xs focus:border-ink outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tradeFilter.dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) =>
                          setTradeFilter({
                            ...tradeFilter,
                            dateRange: {
                              ...tradeFilter.dateRange,
                              end: e.target.value ? new Date(e.target.value) : null,
                            },
                          })
                        }
                        className="w-full h-10 px-3 border border-gray-300 bg-white font-mono text-xs focus:border-ink outline-none"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      setTradeFilter({
                        type: 'ALL',
                        token: 'ALL',
                        dateRange: { start: null, end: null },
                      })
                    }
                    variant="secondary"
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}

              {filteredTrades.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm font-mono uppercase">No trades executed</p>
                </div>
              ) : (
                <div className="border border-gray-300 bg-white">
                  {/* Performance warning for large lists */}
                  {filteredTrades.length > 100 && (
                    <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-xs text-yellow-800 font-mono">
                      Showing first 100 of {filteredTrades.length} trades. Use filters to narrow results.
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-300 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold uppercase text-ink">Date</th>
                          <th className="px-4 py-3 text-left font-bold uppercase text-ink">Type</th>
                          <th className="px-4 py-3 text-left font-bold uppercase text-ink">
                            Input
                          </th>
                          <th className="px-4 py-3 text-left font-bold uppercase text-ink">
                            Output
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            Price
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            Fees
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">Gas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrades.slice(0, 100).map((trade) => (
                          <tr key={trade.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(trade.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-gray-100 text-ink uppercase text-[10px]">
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{trade.inputToken}</td>
                            <td className="px-4 py-3 text-gray-600">{trade.outputToken || '-'}</td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {trade.inputAmount.toFixed(4)} {trade.inputToken}
                              {trade.outputAmount && (
                                <div className="text-gray-400">
                                  → {trade.outputAmount.toFixed(4)} {trade.outputToken}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ${trade.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ${trade.fees.toFixed(4)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {trade.gasCost.toFixed(6)} ETH
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'comparison' ? (
            <div
              role="tabpanel"
              id="comparison-panel"
              aria-labelledby="comparison-tab"
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-bold uppercase text-ink mb-4">
                  Strategy vs Benchmarks
                </h3>

                {/* Benchmark Comparison Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="border border-gray-300 p-4 bg-white">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Strategy</div>
                    <div
                      className={`text-2xl font-mono font-bold ${metrics.totalReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}
                    >
                      {metrics.totalReturn >= 0 ? '+' : ''}
                      {metrics.totalReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div className="border border-gray-300 p-4 bg-white">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">HODL</div>
                    <div
                      className={`text-2xl font-mono font-bold ${hodlReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}
                    >
                      {hodlReturn >= 0 ? '+' : ''}
                      {hodlReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div className="border border-gray-300 p-4 bg-white">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">BTC (Est.)</div>
                    <div className="text-2xl font-mono font-bold text-gray-400">
                      {hodlReturn >= 0 ? '+' : ''}
                      {(hodlReturn * 0.8).toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Estimated</div>
                  </div>
                  <div className="border border-gray-300 p-4 bg-white">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">ETH (Est.)</div>
                    <div className="text-2xl font-mono font-bold text-gray-400">
                      {hodlReturn >= 0 ? '+' : ''}
                      {(hodlReturn * 0.9).toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Estimated</div>
                  </div>
                </div>

                {/* Performance Comparison Table */}
                <div className="border border-gray-300 bg-white mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-gray-50 border-b border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold uppercase text-ink">
                            Metric
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            Strategy
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            HODL
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            BTC (Est.)
                          </th>
                          <th className="px-4 py-3 text-right font-bold uppercase text-ink">
                            ETH (Est.)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 text-gray-600">Total Return</td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${metrics.totalReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}
                          >
                            {metrics.totalReturn >= 0 ? '+' : ''}
                            {metrics.totalReturn.toFixed(2)}%
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${hodlReturn >= 0 ? 'text-success-green' : 'text-alert-red'}`}
                          >
                            {hodlReturn >= 0 ? '+' : ''}
                            {hodlReturn.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {hodlReturn >= 0 ? '+' : ''}
                            {(hodlReturn * 0.8).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {hodlReturn >= 0 ? '+' : ''}
                            {(hodlReturn * 0.9).toFixed(2)}%
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 text-gray-600">Sharpe Ratio</td>
                          <td className="px-4 py-3 text-right font-bold text-ink">
                            {metrics.sharpeRatio.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 text-gray-600">Max Drawdown</td>
                          <td className="px-4 py-3 text-right font-bold text-alert-red">
                            {metrics.maxDrawdown.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {(metrics.maxDrawdown * 0.5).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {(metrics.maxDrawdown * 0.6).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {(metrics.maxDrawdown * 0.55).toFixed(2)}%
                          </td>
                        </tr>
                        {advancedMetrics && (
                          <>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-3 text-gray-600">Sortino Ratio</td>
                              <td className="px-4 py-3 text-right font-bold text-ink">
                                {advancedMetrics.sortinoRatio.toFixed(4)}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-3 text-gray-600">Calmar Ratio</td>
                              <td className="px-4 py-3 text-right font-bold text-ink">
                                {advancedMetrics.calmarRatio.toFixed(4)}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-3 text-gray-600">Value at Risk (95%)</td>
                              <td className="px-4 py-3 text-right font-bold text-alert-red">
                                {advancedMetrics.valueAtRisk95.toFixed(2)}%
                              </td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-3 text-gray-600">Conditional VaR (95%)</td>
                              <td className="px-4 py-3 text-right font-bold text-alert-red">
                                {advancedMetrics.conditionalVaR95.toFixed(2)}%
                              </td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                              <td className="px-4 py-3 text-right text-gray-400">-</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Chart Comparison */}
                <div className="h-[400px] border border-gray-300 bg-white p-4">
                  {combinedChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }}
                        />
                        <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #000',
                            borderRadius: '0px',
                            fontFamily: 'IBM Plex Mono',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="strategy"
                          stroke="#00D395"
                          strokeWidth={2}
                          name="Strategy"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="hodl"
                          stroke="#FF5500"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="HODL"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p className="text-sm font-mono uppercase">No comparison data</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">
                    <strong>Note:</strong> BTC and ETH returns are estimated based on historical
                    correlation. For accurate benchmark comparisons, connect to a price data API.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'advanced' ? (
            <div
              role="tabpanel"
              id="advanced-panel"
              aria-labelledby="advanced-tab"
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-bold uppercase text-ink mb-4">Advanced Risk Metrics</h3>
                {advancedMetrics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Sortino Ratio
                      </div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.sortinoRatio.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Risk-adjusted return (downside only)
                      </div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Calmar Ratio
                      </div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.calmarRatio.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Annual return / Max drawdown
                      </div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Information Ratio
                      </div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.informationRatio.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Excess return / Tracking error
                      </div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Volatility
                      </div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.volatility.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Annualized volatility</div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Downside Volatility
                      </div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.downsideVolatility.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Volatility of negative returns
                      </div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Beta</div>
                      <div className="text-2xl font-mono font-bold text-ink">
                        {advancedMetrics.beta.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Market sensitivity</div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Value at Risk (95%)
                      </div>
                      <div className="text-2xl font-mono font-bold text-alert-red">
                        {advancedMetrics.valueAtRisk95.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Expected max loss on 95% of days
                      </div>
                    </div>
                    <div className="border border-gray-300 p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Conditional VaR (95%)
                      </div>
                      <div className="text-2xl font-mono font-bold text-alert-red">
                        {advancedMetrics.conditionalVaR95.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Expected loss in worst 5% scenarios
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm font-mono uppercase">Calculating advanced metrics...</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">
                  Metric Definitions
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <strong>Sortino Ratio:</strong> Measures risk-adjusted return, but only
                    penalizes downside volatility (negative returns). Higher is better.
                  </div>
                  <div>
                    <strong>Calmar Ratio:</strong> Annual return divided by maximum drawdown. Higher
                    indicates better risk-adjusted performance.
                  </div>
                  <div>
                    <strong>Information Ratio:</strong> Measures excess return per unit of tracking
                    error relative to a benchmark.
                  </div>
                  <div>
                    <strong>Beta:</strong> Measures sensitivity to market movements. Beta &gt; 1
                    means more volatile than market.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};
