/**
 * Paper Trading Modal Component
 * Configure and view paper trading sessions
 */

import { X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { getUserFriendlyErrorMessage } from '../../lib/error/handler';
import { logger } from '../../lib/monitoring/logger';
import {
  type PaperTradingConfig,
  type PaperTradingSession,
  paperTradingEngine,
} from '../../services/paperTrading';
import type { LegoBlock } from '../../types';
import { Button } from '../ui/Button';
import { BacktestModal } from './BacktestModal';

interface PaperTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: LegoBlock[];
  sessionId?: string; // If provided, view existing session; otherwise create new
}

export const PaperTradingModal: React.FC<PaperTradingModalProps> = ({
  isOpen,
  onClose,
  blocks,
  sessionId,
}) => {
  const { error: showError, success: showSuccess } = useToast();
  const [initialCapital, setInitialCapital] = useState(10000);
  const [rebalanceInterval, setRebalanceInterval] = useState(86400000); // 1 day in ms
  const [strategyName, setStrategyName] = useState('');
  const [session, setSession] = useState<PaperTradingSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showBacktestModal, setShowBacktestModal] = useState(false);

  // Load session if viewing existing
  useEffect(() => {
    if (isOpen && sessionId) {
      const existingSession = paperTradingEngine.getSession(sessionId);
      if (existingSession) {
        setSession(existingSession);
        setInitialCapital(existingSession.config.initialCapital);
        setRebalanceInterval(existingSession.config.rebalanceInterval);
        setStrategyName(existingSession.config.strategyName || '');
      }
    } else if (isOpen && !sessionId) {
      // Reset for new session
      setSession(null);
      setInitialCapital(10000);
      setRebalanceInterval(86400000);
      setStrategyName('');
    }
  }, [isOpen, sessionId]);

  const handleCreateSession = useCallback(async () => {
    if (blocks.length === 0) {
      showError('Please add blocks to your strategy before starting paper trading');
      return;
    }

    setIsCreating(true);
    try {
      const config: PaperTradingConfig = {
        blocks,
        initialCapital,
        rebalanceInterval,
        startDate: new Date(),
        strategyName: strategyName || undefined,
      };

      const newSession = paperTradingEngine.createSession(config);
      setSession(newSession);
      showSuccess('Paper trading session created');
    } catch (error) {
      showError(getUserFriendlyErrorMessage(error, 'creating paper trading session'));
      logger.error(
        'Error creating paper trading session',
        error instanceof Error ? error : new Error(String(error)),
        'PaperTradingModal'
      );
    } finally {
      setIsCreating(false);
    }
  }, [blocks, initialCapital, rebalanceInterval, strategyName, showError, showSuccess]);

  const handleStart = useCallback(() => {
    if (!session) return;

    try {
      paperTradingEngine.startSession(session.id);
      showSuccess('Paper trading session started');
      onClose();
    } catch (error) {
      showError(getUserFriendlyErrorMessage(error, 'starting paper trading session'));
    }
  }, [session, showError, showSuccess, onClose]);

  const handleViewResults = useCallback(() => {
    if (!session) return;
    setShowBacktestModal(true);
  }, [session]);

  if (!isOpen) return null;

  const intervalOptions = [
    { label: '1 hour', value: 3600000 },
    { label: '6 hours', value: 21600000 },
    { label: '12 hours', value: 43200000 },
    { label: '1 day', value: 86400000 },
    { label: '1 week', value: 604800000 },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white w-full max-w-2xl border border-gray-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-300">
            <h2 className="text-lg font-bold uppercase font-mono text-ink">
              {sessionId ? 'Paper Trading Session' : 'New Paper Trading Session'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {session ? (
              // View existing session
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase font-mono text-ink mb-2">
                    Session Details
                  </h3>
                  <div className="border border-gray-300 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className="text-sm font-mono font-bold">
                        {session.status === 'running' && (
                          <span className="text-green-600">Running</span>
                        )}
                        {session.status === 'paused' && (
                          <span className="text-yellow-600">Paused</span>
                        )}
                        {session.status === 'stopped' && (
                          <span className="text-gray-600">Stopped</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Initial Capital:</span>
                      <span className="text-sm font-mono font-bold">
                        $
                        {session.config.initialCapital.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Equity:</span>
                      <span className="text-sm font-mono font-bold">
                        $
                        {(
                          session.results.equityCurve[session.results.equityCurve.length - 1]
                            ?.equity || session.config.initialCapital
                        ).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Return:</span>
                      <span
                        className={`text-sm font-mono font-bold ${session.results.metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {(session.results.metrics.totalReturn * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Trades:</span>
                      <span className="text-sm font-mono font-bold">
                        {session.results.metrics.totalTrades}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {session.status === 'stopped' && (
                    <Button onClick={handleStart} fullWidth>
                      Start Session
                    </Button>
                  )}
                  {session.status === 'running' && (
                    <Button
                      onClick={() => paperTradingEngine.pauseSession(session.id)}
                      fullWidth
                      variant="secondary"
                    >
                      Pause Session
                    </Button>
                  )}
                  {session.status === 'paused' && (
                    <Button onClick={() => paperTradingEngine.resumeSession(session.id)} fullWidth>
                      Resume Session
                    </Button>
                  )}
                  <Button onClick={handleViewResults} fullWidth variant="secondary">
                    View Results
                  </Button>
                </div>
              </div>
            ) : (
              // Create new session
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase font-mono text-ink mb-2">
                    Strategy Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="My Paper Trading Strategy"
                    className="w-full px-4 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-orange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase font-mono text-ink mb-2">
                    Initial Capital (USD)
                  </label>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    min="1"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-orange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase font-mono text-ink mb-2">
                    Rebalance Interval
                  </label>
                  <select
                    value={rebalanceInterval}
                    onChange={(e) => setRebalanceInterval(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-orange"
                  >
                    {intervalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border border-gray-300 p-4 bg-gray-50">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> Paper trading will execute your strategy automatically at
                    the selected interval using real-time prices. You can pause or stop the session
                    at any time.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateSession}
                    fullWidth
                    disabled={isCreating || blocks.length === 0}
                  >
                    {isCreating ? 'Creating...' : 'Create Session'}
                  </Button>
                  <Button onClick={onClose} fullWidth variant="secondary">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backtest Results Modal */}
      {showBacktestModal && session && (
        <BacktestModal
          isOpen={showBacktestModal}
          onClose={() => setShowBacktestModal(false)}
          result={session.results}
        />
      )}
    </>
  );
};
