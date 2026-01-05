/**
 * Position Monitor Hook
 * Tracks live positions with real-time P&L updates
 */

import { useEffect, useMemo, useState } from 'react';
import { useMultiPriceFeed } from './usePriceFeed';

export interface Position {
  asset: string;
  amount: number;
  entryPrice: number;
  entryValue: number;
  strategyId?: string;
  timestamp: number;
}

export interface PositionWithPnL extends Position {
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  isProfit: boolean;
}

export interface UsePositionMonitorResult {
  positions: PositionWithPnL[];
  totalPnL: number;
  totalPnLPercent: number;
  totalValue: number;
  isLoading: boolean;
}

/**
 * Hook for monitoring positions with real-time P&L
 */
export function usePositionMonitor(positions: Position[]): UsePositionMonitorResult {
  const [isLoading, setIsLoading] = useState(true);
  const tokens = useMemo(() => positions.map((p) => p.asset), [positions]);
  const prices = useMultiPriceFeed(tokens);

  useEffect(() => {
    // Check if we have prices for all positions
    const hasAllPrices =
      tokens.length === 0 || tokens.every((token) => prices.get(token) !== undefined);
    setIsLoading(!hasAllPrices);
  }, [tokens, prices]);

  const positionsWithPnL = useMemo(() => {
    return positions.map((position) => {
      const currentPrice = prices.get(position.asset) || 0;
      const currentValue = currentPrice * position.amount;
      const pnl = currentValue - position.entryValue;
      const pnlPercent = position.entryValue > 0 ? (pnl / position.entryValue) * 100 : 0;

      return {
        ...position,
        currentPrice,
        currentValue,
        pnl,
        pnlPercent,
        isProfit: pnl >= 0,
      };
    });
  }, [positions, prices]);

  const totalPnL = useMemo(() => {
    return positionsWithPnL.reduce((sum, p) => sum + p.pnl, 0);
  }, [positionsWithPnL]);

  const totalEntryValue = useMemo(() => {
    return positionsWithPnL.reduce((sum, p) => sum + p.entryValue, 0);
  }, [positionsWithPnL]);

  const totalPnLPercent = useMemo(() => {
    return totalEntryValue > 0 ? (totalPnL / totalEntryValue) * 100 : 0;
  }, [totalPnL, totalEntryValue]);

  const totalValue = useMemo(() => {
    return positionsWithPnL.reduce((sum, p) => sum + p.currentValue, 0);
  }, [positionsWithPnL]);

  return {
    positions: positionsWithPnL,
    totalPnL,
    totalPnLPercent,
    totalValue,
    isLoading,
  };
}
