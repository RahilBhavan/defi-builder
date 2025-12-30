import { motion } from 'framer-motion';
import { Activity, ArrowDownLeft, ArrowUpRight, Loader2, PieChart, Wallet, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMultiPriceFeed } from '../../hooks/usePriceFeed';
import { portfolioTracker, type PortfolioTransaction } from '../../services/portfolioTracker';
import { Button } from '../ui/Button';
import { Skeleton, TableRowSkeleton } from '../ui/Skeleton';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Holding {
  asset: string;
  amount: number;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose }) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [activeStrategies, setActiveStrategies] = useState(0);

  // Load portfolio data when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      // Simulate async loading for better UX
      setTimeout(() => {
        const currentHoldings = portfolioTracker.getCurrentHoldings();
        const holdingsArray: Holding[] = Array.from(currentHoldings.entries())
          .filter(([, amount]) => amount > 0.0001) // Filter out dust
          .map(([asset, amount]) => ({ asset, amount }));

        setHoldings(holdingsArray);
        setTransactions(portfolioTracker.getTransactions(10)); // Last 10 transactions

        // Count unique strategies from transactions
        const uniqueStrategies = new Set(
          portfolioTracker.getTransactions().map((tx) => tx.strategyId).filter(Boolean)
        );
        setActiveStrategies(uniqueStrategies.size || 0);
        setIsLoadingData(false);
      }, 100); // Small delay to show loading state
    }
  }, [isOpen]);

  const tokens = useMemo(() => holdings.map((h) => h.asset), [holdings]);
  const prices = useMultiPriceFeed(tokens);
  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());
  
  // Check if prices are loading (have tokens but no prices yet)
  const isLoadingPrices = tokens.length > 0 && Array.from(prices.values()).every((p) => p === undefined);

  // Track price changes
  useEffect(() => {
    const newPreviousPrices = new Map<string, number>();
    prices.forEach((price, token) => {
      const current = previousPrices.get(token);
      if (price !== undefined && current !== undefined) {
        newPreviousPrices.set(token, current);
      } else if (price !== undefined) {
        newPreviousPrices.set(token, price);
      }
    });
    setPreviousPrices(newPreviousPrices);
  }, [prices]);

  const holdingsWithPrices = useMemo(() => {
    return holdings.map((holding) => {
      const price = prices.get(holding.asset);
      const previousPrice = previousPrices.get(holding.asset);
      const value = price !== undefined ? price * holding.amount : 0;
      const change =
        price !== undefined && previousPrice !== undefined && previousPrice > 0
          ? ((price - previousPrice) / previousPrice) * 100
          : 0;

      return {
        ...holding,
        price: price || 0,
        value,
        change,
        formattedValue: `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formattedChange: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      };
    });
  }, [holdings, prices, previousPrices]);

  const totalEquity = useMemo(() => {
    return holdingsWithPrices.reduce((sum, h) => sum + h.value, 0);
  }, [holdingsWithPrices]);

  const totalChange24h = useMemo(() => {
    const totalPrevious = holdingsWithPrices.reduce((sum, h) => {
      const prevPrice = previousPrices.get(h.asset) || 0;
      return sum + prevPrice * h.amount;
    }, 0);
    return totalPrevious > 0 ? ((totalEquity - totalPrevious) / totalPrevious) * 100 : 0;
  }, [holdingsWithPrices, totalEquity, previousPrices]);

  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-12 touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-5xl h-[85vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
          <div className="flex items-center gap-3">
            <Wallet className="text-ink" size={24} aria-hidden="true" />
            <h2 id="portfolio-modal-title" className="text-lg font-bold font-mono uppercase">
              Portfolio
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 text-ink transition-colors"
            aria-label="Close portfolio modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoadingData ? (
            <div className="space-y-6">
              {/* Loading skeletons for stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 bg-white border border-gray-200 shadow-sm">
                    <Skeleton height={16} className="mb-2" />
                    <Skeleton height={40} className="mb-2" />
                    <Skeleton height={14} width="60%" />
                  </div>
                ))}
              </div>
              {/* Loading skeleton for table */}
              <div className="bg-white border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[1, 2, 3, 4].map((i) => (
                        <th key={i} className="px-6 py-3">
                          <Skeleton height={12} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <TableRowSkeleton key={i} columns={4} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-6 bg-white border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Total Equity
                    </p>
                    <div title="Live">
                      <Activity size={14} className="text-success-green animate-pulse" />
                    </div>
                  </div>
                  <p className="text-4xl font-mono font-bold text-ink">
                    $
                    {totalEquity.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
              <p
                className={`text-sm font-mono mt-2 flex items-center gap-1 ${
                  totalChange24h >= 0 ? 'text-success-green' : 'text-alert-red'
                }`}
              >
                {totalChange24h >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                {totalChange24h >= 0 ? '+' : ''}
                {totalChange24h.toFixed(2)}% (24h)
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Active Strategies
              </p>
              <p className="text-4xl font-mono font-bold text-ink">{activeStrategies}</p>
              <p className="text-sm font-mono text-gray-500 mt-2">
                {activeStrategies === 0 ? 'No active strategies' : 'From backtests'}
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Net APY
              </p>
              <p className="text-4xl font-mono font-bold text-orange">12.4%</p>
              <p className="text-sm font-mono text-gray-500 mt-2">Weighted Average</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Holdings Table */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
                  <PieChart size={16} /> Assets
                </h3>
              </div>
              <div className="bg-white border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                      <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase">Asset</th>
                      <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">
                        Balance
                      </th>
                      <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">
                        Value
                      </th>
                      <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingPrices && holdings.length > 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 size={20} className="text-orange animate-spin" />
                            <p className="text-xs font-mono text-gray-500 uppercase">Loading prices...</p>
                          </div>
                        </td>
                      </tr>
                    ) : holdingsWithPrices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm font-mono text-gray-400">
                          No holdings
                        </td>
                      </tr>
                    ) : (
                      holdingsWithPrices.map((item) => (
                        <tr key={item.asset} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-ink">{item.asset}</td>
                          <td className="px-6 py-4 font-mono text-right text-gray-600">
                            {item.amount.toLocaleString('en-US', {
                              maximumFractionDigits: item.asset === 'USDC' ? 2 : 8,
                            })}
                          </td>
                          <td className="px-6 py-4 font-mono text-right text-ink">
                            {item.formattedValue}
                          </td>
                          <td
                            className={`px-6 py-4 font-mono text-right flex items-center justify-end gap-1 ${
                              item.change > 0
                                ? 'text-success-green'
                                : item.change < 0
                                  ? 'text-alert-red'
                                  : 'text-gray-400'
                            }`}
                          >
                            {item.change > 0 ? (
                              <ArrowUpRight size={12} />
                            ) : item.change < 0 ? (
                              <ArrowDownLeft size={12} />
                            ) : null}
                            {item.formattedChange}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="w-full md:w-1/3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase text-gray-500">History</h3>
                {transactions.length > 10 && (
                  <button className="text-xs text-orange hover:underline">View All</button>
                )}
              </div>
              <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm font-mono uppercase">No transactions yet</p>
                    <p className="text-xs mt-2">Execute strategies to see transactions</p>
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const timeAgo = getTimeAgo(tx.timestamp);
                    return (
                      <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-none uppercase text-gray-600">
                            {tx.type}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{timeAgo}</span>
                        </div>
                        <p className="text-sm font-bold text-ink mb-1">{tx.description}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-mono text-gray-500">{tx.amount}</p>
                          <div className="flex items-center gap-1 text-[10px] text-success-green uppercase font-bold">
                            <div className="w-1.5 h-1.5 bg-success-green rounded-full" />
                            {tx.status}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-gray-300 bg-white px-8 flex items-center justify-end gap-4">
          <Button variant="secondary">Deposit</Button>
          <Button variant="primary">Withdraw</Button>
        </div>
      </motion.div>
    </div>
  );
};
