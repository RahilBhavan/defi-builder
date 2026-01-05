import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../__tests__/utils/test-utils';
import * as settingsStorage from '../../../services/settingsStorage';
import { SettingsModal } from '../SettingsModal';

// Mock dependencies
vi.mock('../../../services/settingsStorage');
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    effectiveTheme: 'light',
    setTheme: vi.fn(),
  })),
}));

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockUpdateSection = vi.fn();
  const mockResetSettings = vi.fn();

  const mockSettings = {
    general: {
      theme: 'light',
      language: 'en',
      notifications: true,
    },
    network: {
      sepoliaRpcUrl: 'https://sepolia.infura.io/v3/test',
      mainnetRpcUrl: 'https://mainnet.infura.io/v3/test',
    },
    api: {
      coingeckoApiKey: '',
      geminiApiKey: '',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (settingsStorage.useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: mockSettings,
      updateSection: mockUpdateSection,
      resetSettings: mockResetSettings,
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <SettingsModal isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it('displays all tabs', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole('button', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /network/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /api/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const networkTab = screen.getByRole('button', { name: /network/i });
    await user.click(networkTab);

    await waitFor(() => {
      expect(screen.getByLabelText(/sepolia rpc url/i)).toBeInTheDocument();
    });
  });

  it('displays current settings values', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByDisplayValue(/sepolia.infura.io/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('saves settings when save button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockUpdateSection).toHaveBeenCalled();
  });

  it('shows reset confirmation dialog when reset is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/reset settings/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before saving', async () => {
    const user = userEvent.setup();
    (settingsStorage.useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: {
        ...mockSettings,
        network: {
          ...mockSettings.network,
          sepoliaRpcUrl: '', // Empty required field
        },
      },
      updateSection: mockUpdateSection,
      resetSettings: mockResetSettings,
    });

    renderWithProviders(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    // Switch to network tab
    const networkTab = screen.getByRole('button', { name: /network/i });
    await user.click(networkTab);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/sepolia rpc url is required/i)).toBeInTheDocument();
    });
  });
});
