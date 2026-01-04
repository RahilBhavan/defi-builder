import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StrategyLibraryModal } from '../StrategyLibraryModal';
import * as strategyStorage from '../../../services/strategyStorage';
import { renderWithProviders } from '../../../__tests__/utils/test-utils';

// Mock dependencies
vi.mock('../../../services/strategyStorage');
vi.mock('../../../services/cloudSync', () => ({
  useCloudSync: vi.fn(() => ({
    strategies: [],
    syncStrategy: vi.fn(),
    isLoading: false,
  })),
}));
vi.mock('../../../features/strategy-builder/services/sharing', () => ({
  generateShareLink: vi.fn(() => 'https://share.example.com/strategy-123'),
}));

describe('StrategyLibraryModal', () => {
  const mockOnClose = vi.fn();
  const mockOnLoadStrategy = vi.fn();
  const mockBlocks = [
    {
      id: '1',
      type: 'ENTRY' as const,
      name: 'Price Trigger',
      label: 'Price Trigger',
      category: 'ENTRY' as const,
      params: { token: 'ETH', price: 2000 } as Record<string, unknown>,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (strategyStorage.getStrategies as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        id: 'strategy-1',
        name: 'Test Strategy',
        blocks: mockBlocks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <StrategyLibraryModal isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    expect(screen.getByText(/strategy library/i)).toBeInTheDocument();
  });

  it('displays saved strategies', async () => {
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/test strategy/i)).toBeInTheDocument();
    });
  });

  it('switches between templates and saved view', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      const templatesTab = screen.getByRole('button', { name: /templates/i });
      expect(templatesTab).toBeInTheDocument();
    });
    
    const templatesTab = screen.getByRole('button', { name: /templates/i });
    await user.click(templatesTab);
    
    await waitFor(() => {
      expect(screen.getByText(/dca/i) || screen.getByText(/yield/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('opens save dialog when save button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal 
        isOpen={true} 
        onClose={mockOnClose}
        currentBlocks={mockBlocks}
      />
    );
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter strategy name/i)).toBeInTheDocument();
    });
  });

  it('loads strategy when load button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal 
        isOpen={true} 
        onClose={mockOnClose}
        onLoadStrategy={mockOnLoadStrategy}
      />
    );
    
    await waitFor(() => {
      const loadButton = screen.getByRole('button', { name: /load/i });
      expect(loadButton).toBeInTheDocument();
    });
    
    const loadButton = screen.getByRole('button', { name: /load/i });
    await user.click(loadButton);
    
    expect(mockOnLoadStrategy).toHaveBeenCalled();
  });

  it('filters strategies by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(screen.getByText(/test strategy/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no strategies match search', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StrategyLibraryModal isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText(/no strategies found/i)).toBeInTheDocument();
    });
  });
});

