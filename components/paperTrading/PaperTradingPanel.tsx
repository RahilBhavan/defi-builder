/**
 * Paper Trading Panel Component
 * Displays and manages paper trading sessions
 */

import { Pause, Play, Square, TrendingUp, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { getUserFriendlyErrorMessage } from '../../lib/error/handler';
import { logger } from '../../lib/monitoring/logger';
import {
  type PaperTradingSession,
  type PaperTradingStatusUpdate,
  paperTradingEngine,
} from '../../services/paperTrading';
import { BacktestVisualization } from '../optimization/BacktestVisualization';
import { Button } from '../ui/Button';

interface PaperTradingPanelProps {
  onClose: () => void;
  isOpen: boolean;
  onCreateSession: () => void;
  onViewSession: (sessionId: string) => void;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  onClose,
  isOpen,
  onCreateSession,
  onViewSession,
}) => {
  const { error: showError, success: showSuccess } = useToast();
  const [sessions, setSessions] = useState<PaperTradingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Map<string, PaperTradingStatusUpdate>>(
    new Map()
  );

  // Load sessions
  const loadSessions = useCallback(() => {
    const allSessions = paperTradingEngine.getAllSessions();
    setSessions(allSessions);

    // Set first session as selected if none selected
    if (!selectedSessionId && allSessions.length > 0) {
      setSelectedSessionId(allSessions[0]?.id || null);
    }
  }, [selectedSessionId]);

  // Subscribe to status updates
  useEffect(() => {
    if (!isOpen) return;

    loadSessions();

    const unsubscribe = paperTradingEngine.onStatusUpdate((update: PaperTradingStatusUpdate) => {
      setStatusUpdates((prev) => {
        const next = new Map(prev);
        next.set(update.sessionId, update);
        return next;
      });
      // Reload sessions to get updated data
      loadSessions();
    });

    // Refresh sessions periodically
    const interval = setInterval(() => {
      loadSessions();
    }, 5000); // Every 5 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, loadSessions]);

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  // Status update available for future use
  // const statusUpdate = selectedSessionId ? statusUpdates.get(selectedSessionId) : undefined;

  const handleStart = useCallback(
    (sessionId: string) => {
      try {
        paperTradingEngine.startSession(sessionId);
        showSuccess('Paper trading session started');
        loadSessions();
      } catch (error) {
        showError(getUserFriendlyErrorMessage(error, 'starting paper trading session'));
        logger.error(
          'Error starting paper trading session',
          error instanceof Error ? error : new Error(String(error)),
          'PaperTradingPanel'
        );
      }
    },
    [showError, showSuccess, loadSessions]
  );

  const handlePause = useCallback(
    (sessionId: string) => {
      try {
        paperTradingEngine.pauseSession(sessionId);
        showSuccess('Paper trading session paused');
        loadSessions();
      } catch (error) {
        showError(getUserFriendlyErrorMessage(error, 'pausing paper trading session'));
      }
    },
    [showError, showSuccess, loadSessions]
  );

  const handleStop = useCallback(
    (sessionId: string) => {
      try {
        paperTradingEngine.stopSession(sessionId);
        showSuccess('Paper trading session stopped');
        loadSessions();
      } catch (error) {
        showError(getUserFriendlyErrorMessage(error, 'stopping paper trading session'));
      }
    },
    [showError, showSuccess, loadSessions]
  );

  const handleDelete = useCallback(
    (sessionId: string) => {
      if (!confirm('Are you sure you want to delete this paper trading session?')) {
        return;
      }

      try {
        paperTradingEngine.deleteSession(sessionId);
        showSuccess('Paper trading session deleted');
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        loadSessions();
      } catch (error) {
        showError(getUserFriendlyErrorMessage(error, 'deleting paper trading session'));
      }
    },
    [showError, showSuccess, selectedSessionId, loadSessions]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col border border-gray-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className="text-lg font-bold uppercase font-mono text-ink">Paper Trading</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sessions List */}
          <div className="w-80 border-r border-gray-300 flex flex-col">
            <div className="p-4 border-b border-gray-300">
              <Button onClick={onCreateSession} fullWidth>
                + New Session
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No paper trading sessions</p>
                  <p className="text-xs mt-2">Create a new session to start paper trading</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sessions.map((session) => {
                    const update = statusUpdates.get(session.id);
                    const currentEquity =
                      update?.equity ||
                      session.results.equityCurve[session.results.equityCurve.length - 1]?.equity ||
                      session.config.initialCapital;
                    const returnPercent =
                      ((currentEquity - session.config.initialCapital) /
                        session.config.initialCapital) *
                      100;
                    const isSelected = session.id === selectedSessionId;

                    return (
                      <div
                        key={session.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange/10 border-l-4 border-orange' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold font-mono text-ink truncate">
                              {session.config.strategyName || `Session ${session.id.slice(-8)}`}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {session.status === 'running' && (
                                <span className="text-green-600">● Running</span>
                              )}
                              {session.status === 'paused' && (
                                <span className="text-yellow-600">● Paused</span>
                              )}
                              {session.status === 'stopped' && (
                                <span className="text-gray-600">● Stopped</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Equity:</span>
                            <span className="font-mono font-bold">
                              $
                              {currentEquity.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Return:</span>
                            <span
                              className={`font-mono font-bold ${returnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {returnPercent >= 0 ? '+' : ''}
                              {returnPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-1">
                          {session.status === 'stopped' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStart(session.id);
                              }}
                              className="flex-1 px-2 py-1 text-xs font-mono bg-green-600 text-white hover:bg-green-700"
                            >
                              <Play className="w-3 h-3 inline mr-1" />
                              Start
                            </button>
                          )}
                          {session.status === 'running' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePause(session.id);
                              }}
                              className="flex-1 px-2 py-1 text-xs font-mono bg-yellow-600 text-white hover:bg-yellow-700"
                            >
                              <Pause className="w-3 h-3 inline mr-1" />
                              Pause
                            </button>
                          )}
                          {session.status === 'paused' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStart(session.id);
                              }}
                              className="flex-1 px-2 py-1 text-xs font-mono bg-green-600 text-white hover:bg-green-700"
                            >
                              <Play className="w-3 h-3 inline mr-1" />
                              Resume
                            </button>
                          )}
                          {(session.status === 'running' || session.status === 'paused') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStop(session.id);
                              }}
                              className="flex-1 px-2 py-1 text-xs font-mono bg-red-600 text-white hover:bg-red-700"
                            >
                              <Square className="w-3 h-3 inline mr-1" />
                              Stop
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session.id);
                            }}
                            className="px-2 py-1 text-xs font-mono bg-gray-300 text-gray-700 hover:bg-gray-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Session Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedSession ? (
              <>
                <div className="p-4 border-b border-gray-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-mono text-ink">
                        {selectedSession.config.strategyName ||
                          `Session ${selectedSession.id.slice(-8)}`}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {selectedSession.startTime.toLocaleString()}
                      </p>
                    </div>
                    <Button onClick={() => onViewSession(selectedSession.id)} variant="secondary">
                      View Details
                    </Button>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="border border-gray-300 p-3 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Total Return
                      </div>
                      <div className="text-xl font-mono font-bold text-ink">
                        {(selectedSession.results.metrics.totalReturn * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="border border-gray-300 p-3 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Sharpe Ratio
                      </div>
                      <div className="text-xl font-mono font-bold text-ink">
                        {selectedSession.results.metrics.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div className="border border-gray-300 p-3 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Max Drawdown
                      </div>
                      <div className="text-xl font-mono font-bold text-ink">
                        {(selectedSession.results.metrics.maxDrawdown * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="border border-gray-300 p-3 bg-white">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Total Trades
                      </div>
                      <div className="text-xl font-mono font-bold text-ink">
                        {selectedSession.results.metrics.totalTrades}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1 p-4">
                  {selectedSession.results.equityCurve.length > 0 ? (
                    <div className="h-full min-h-[400px]">
                      <BacktestVisualization
                        solutions={[
                          {
                            id: selectedSession.id,
                            parameters: {},
                            inSampleScores: {
                              sharpeRatio: selectedSession.results.metrics.sharpeRatio,
                              totalReturn: selectedSession.results.metrics.totalReturn,
                              maxDrawdown: selectedSession.results.metrics.maxDrawdown,
                            },
                            outOfSampleScores: {
                              sharpeRatio: selectedSession.results.metrics.sharpeRatio,
                              totalReturn: selectedSession.results.metrics.totalReturn,
                              maxDrawdown: selectedSession.results.metrics.maxDrawdown,
                            },
                            degradation: 0,
                            isParetoOptimal: true,
                            backtestResult: selectedSession.results,
                          },
                        ]}
                        selectedSolutionId={selectedSession.id}
                        initialCapital={selectedSession.config.initialCapital}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-mono uppercase">No data yet</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Start the session to begin collecting data
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-mono uppercase">Select a session</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Choose a session from the list to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
