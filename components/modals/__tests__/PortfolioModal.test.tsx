import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PortfolioModal } from '../PortfolioModal';
import { renderWithProviders } from '../../../__tests__/utils/test-utils';

// Mock dependencies
const mockGetCurrentHoldings = vi.fn();
const mockGetTransactions = vi.fn();
const mockUseMultiPriceFeed = vi.fn();

vi.mock('../../../services/portfolioTracker', () => ({
  portfolioTracker: {
    getCurrentHoldings: () => mockGetCurrentHoldings(),
    getTransactions: () => mockGetTransactions(),
  },
}));

vi.mock('../../../hooks/usePriceFeed', () => ({
  useMultiPriceFeed: () => mockUseMultiPriceFeed(),
}));

describe('PortfolioModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetCurrentHoldings.mockReturnValue(
      new Map([
        ['ETH', 1.5],
        ['USDC', 5000],
      ])
    );
    
    mockGetTransactions.mockReturnValue([
      {
        id: '1',
        type: 'SWAP',
        description: 'ETH → USDC',
        amount: '1.5 ETH',
        timestamp: Date.now() - 3600000, // 1 hour ago
        status: 'completed' as const,
        token: 'ETH',
        strategyId: 'strategy-1',
      },
    ]);

    mockUseMultiPriceFeed.mockReturnValue(
      new Map([
        ['ETH', 2500],
        ['USDC', 1],
      ])
    );
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <PortfolioModal isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    // Check for skeleton loaders or loading indicators
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays portfolio data after loading', async () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText(/total equity/i)).toBeInTheDocument();
      expect(screen.getByText(/active strategies/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays holdings when available', async () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText(/ETH/i)).toBeInTheDocument();
      expect(screen.getByText(/USDC/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays empty state when no holdings', async () => {
    mockGetCurrentHoldings.mockReturnValue(new Map());
    
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no holdings/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays transactions when available', async () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText(/history/i)).toBeInTheDocument();
      expect(screen.getByText(/ETH → USDC/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays empty transactions state when no transactions', async () => {
    mockGetTransactions.mockReturnValue([]);
    
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close portfolio modal/i });
      expect(closeButton).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const closeButton = screen.getByRole('button', { name: /close portfolio modal/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const backdrop = document.querySelector('.absolute.inset-0.bg-black');
      expect(backdrop).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const backdrop = document.querySelector('.absolute.inset-0.bg-black');
    if (backdrop) {
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('displays deposit and withdraw buttons', async () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deposit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('calculates total equity correctly', async () => {
    renderWithProviders(<PortfolioModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      // ETH: 1.5 * 2500 = 3750
      // USDC: 5000 * 1 = 5000
      // Total: 8750
      const equityText = screen.getByText(/\$8,750/);
      expect(equityText).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

