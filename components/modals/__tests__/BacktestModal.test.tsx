import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../hooks/useToast';
import type { DeFiBacktestResult } from '../../../services/defiBacktestEngine';
import { BacktestModal } from '../BacktestModal';

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('BacktestModal', () => {
  const mockOnClose = vi.fn();

  const mockResult: DeFiBacktestResult = {
    metrics: {
      sharpeRatio: 1.5,
      totalReturn: 0.25,
      maxDrawdown: 0.15,
      winTrades: 10,
      totalTrades: 15,
      totalGasSpent: 0.1,
      totalFeesSpent: 0.05,
    },
    equityCurve: [
      { date: '2024-01-01', equity: 10000 },
      { date: '2024-01-02', equity: 10500 },
      { date: '2024-01-03', equity: 11000 },
    ],
    trades: [],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-03'),
    initialCapital: 10000,
  };

  it('does not render when isOpen is false', () => {
    renderWithToast(<BacktestModal isOpen={false} onClose={mockOnClose} result={mockResult} />);
    expect(screen.queryByText(/backtest results/i)).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    renderWithToast(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    expect(screen.getByText(/backtest results/i)).toBeInTheDocument();
  });

  it('displays metrics when result is provided', () => {
    renderWithToast(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    expect(screen.getByText(/sharpe ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/total return/i)).toBeInTheDocument();
  });

  it('displays empty state when result is null', () => {
    renderWithToast(<BacktestModal isOpen={true} onClose={mockOnClose} result={null} />);
    expect(screen.getByText(/running backtest/i)).toBeInTheDocument();
  });

  it('switches tabs when tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithToast(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);

    const tradesTab = screen.getByRole('tab', { name: /trades/i });
    await user.click(tradesTab);

    // Wait for the trades panel to appear by checking for the "Trade History" heading
    await screen.findByText(/trade history/i, {}, { timeout: 1000 });

    // Check that the trades panel exists with the correct ID
    const tradesPanel = document.getElementById('trades-panel');
    expect(tradesPanel).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithToast(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
