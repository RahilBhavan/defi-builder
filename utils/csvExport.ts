/**
 * CSV export utilities for backtest results
 */

import type { Trade } from '../services/backtest/portfolio';
import type { DeFiBacktestResult } from '../services/defiBacktestEngine';

/**
 * Export equity curve to CSV
 */
export function exportEquityCurveToCSV(result: DeFiBacktestResult): string {
  const headers = ['Date', 'Equity (USD)', 'Return (%)', 'Cumulative Return (%)'];
  const rows: string[][] = [];

  const initialEquity = result.initialCapital;

  result.equityCurve.forEach((point, index) => {
    const prevPoint = index > 0 ? result.equityCurve[index - 1] : null;
    const returnPct =
      prevPoint && prevPoint.equity > 0
        ? ((point.equity - prevPoint.equity) / prevPoint.equity) * 100
        : 0;
    const cumulativeReturn =
      initialEquity > 0 ? ((point.equity - initialEquity) / initialEquity) * 100 : 0;

    rows.push([
      new Date(point.date).toISOString(),
      point.equity.toFixed(2),
      returnPct.toFixed(4),
      cumulativeReturn.toFixed(4),
    ]);
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export trades to CSV
 */
export function exportTradesToCSV(trades: Trade[]): string {
  const headers = [
    'Timestamp',
    'Date',
    'Time',
    'Type',
    'Input Token',
    'Output Token',
    'Input Amount',
    'Output Amount',
    'Price (USD)',
    'Slippage (%)',
    'Fees (USD)',
    'Gas Cost (ETH)',
    'Gas Cost (USD)',
  ];

  const rows: string[][] = trades.map((trade) => {
    const date = new Date(trade.timestamp);
    const ethPrice = 3000; // Approximate ETH price for USD conversion

    return [
      trade.timestamp.toString(),
      date.toISOString().split('T')[0] || '',
      date.toTimeString().split(' ')[0] || '',
      trade.type,
      trade.inputToken,
      trade.outputToken || '',
      trade.inputAmount.toFixed(6),
      trade.outputAmount?.toFixed(6) || '',
      trade.price.toFixed(2),
      trade.slippage?.toFixed(4) || '',
      trade.fees.toFixed(6),
      trade.gasCost.toFixed(8),
      (trade.gasCost * ethPrice).toFixed(2),
    ].filter((cell): cell is string => cell !== undefined);
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export metrics to CSV
 */
export function exportMetricsToCSV(
  result: DeFiBacktestResult,
  advancedMetrics?: {
    sortinoRatio: number;
    calmarRatio: number;
    informationRatio: number;
    beta?: number;
    alpha?: number;
    volatility?: number;
    downsideVolatility?: number;
    valueAtRisk95?: number;
    conditionalVaR95?: number;
  }
): string {
  const headers = ['Metric', 'Value'];
  const rows: string[][] = [
    ['Initial Capital', `$${result.initialCapital.toFixed(2)}`],
    [
      'Final Equity',
      `$${result.equityCurve[result.equityCurve.length - 1]?.equity.toFixed(2) || '0.00'}`,
    ],
    ['Total Return (%)', `${result.metrics.totalReturn.toFixed(2)}%`],
    ['Sharpe Ratio', result.metrics.sharpeRatio.toFixed(4)],
    ['Max Drawdown (%)', `${result.metrics.maxDrawdown.toFixed(2)}%`],
    [
      'Win Rate (%)',
      result.metrics.totalTrades > 0
        ? `${((result.metrics.winTrades / result.metrics.totalTrades) * 100).toFixed(2)}%`
        : '0.00%',
    ],
    ['Total Trades', result.metrics.totalTrades.toString()],
    ['Winning Trades', result.metrics.winTrades.toString()],
    ['Total Gas Spent (ETH)', result.metrics.totalGasSpent.toFixed(8)],
    ['Total Fees Spent (USD)', `$${result.metrics.totalFeesSpent.toFixed(2)}`],
    ['Start Date', result.startDate.toISOString()],
    ['End Date', result.endDate.toISOString()],
  ];

  if (advancedMetrics) {
    rows.push(
      ['Sortino Ratio', advancedMetrics.sortinoRatio.toFixed(4)],
      ['Calmar Ratio', advancedMetrics.calmarRatio.toFixed(4)],
      ['Information Ratio', advancedMetrics.informationRatio.toFixed(4)]
    );
    
    if (advancedMetrics.beta !== undefined) {
      rows.push(['Beta', advancedMetrics.beta.toFixed(4)]);
    }
    if (advancedMetrics.alpha !== undefined) {
      rows.push(['Alpha', advancedMetrics.alpha.toFixed(4)]);
    }
    if (advancedMetrics.volatility !== undefined) {
      rows.push(['Volatility (%)', `${advancedMetrics.volatility.toFixed(2)}%`]);
    }
    if (advancedMetrics.downsideVolatility !== undefined) {
      rows.push(['Downside Volatility (%)', `${advancedMetrics.downsideVolatility.toFixed(2)}%`]);
    }
    if (advancedMetrics.valueAtRisk95 !== undefined) {
      rows.push(['Value at Risk 95% (%)', `${advancedMetrics.valueAtRisk95.toFixed(2)}%`]);
    }
    if (advancedMetrics.conditionalVaR95 !== undefined) {
      rows.push(['Conditional VaR 95% (%)', `${advancedMetrics.conditionalVaR95.toFixed(2)}%`]);
    }
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
