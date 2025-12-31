import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BacktestModal } from '../BacktestModal';
import type { DeFiBacktestResult } from '../../../services/defiBacktestEngine';

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
    render(<BacktestModal isOpen={false} onClose={mockOnClose} result={mockResult} />);
    expect(screen.queryByText(/backtest results/i)).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    expect(screen.getByText(/backtest results/i)).toBeInTheDocument();
  });

  it('displays metrics when result is provided', () => {
    render(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    expect(screen.getByText(/sharpe ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/total return/i)).toBeInTheDocument();
  });

  it('displays empty state when result is null', () => {
    render(<BacktestModal isOpen={true} onClose={mockOnClose} result={null} />);
    expect(screen.getByText(/no backtest results/i)).toBeInTheDocument();
  });

  it('switches tabs when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    
    const tradesTab = screen.getByRole('button', { name: /trades/i });
    await user.click(tradesTab);
    
    expect(screen.getByText(/trade history/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<BacktestModal isOpen={true} onClose={mockOnClose} result={mockResult} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

