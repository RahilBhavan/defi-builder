import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { WagmiProvider } from 'wagmi';
import { ToastProvider } from '../../hooks/useToast';
import { wagmiConfig } from '../../services/web3/config';
import { trpcClient } from '../../utils/api-client';
// httpBatchLink - not used in test utils
import { trpc } from '../../utils/trpc';

/**
 * Test utilities for React component testing
 */

// Create a test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();

  return render(
    <WagmiProvider config={wagmiConfig}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{ui}</ToastProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </WagmiProvider>
  );
}

/**
 * Mock workspace state for testing
 */
export const mockWorkspaceState = {
  blocks: [],
  setBlocks: vi.fn(),
  selectedBlockId: null,
  setSelectedBlockId: vi.fn(),
  selectedBlock: null,
  validationResult: { valid: false, errors: [] },
  isValidating: false,
  showLeftPanel: false,
  setShowLeftPanel: vi.fn(),
  showRightPanel: false,
  setShowRightPanel: vi.fn(),
  handleAddBlock: vi.fn(),
  handleSelectBlock: vi.fn(),
  handleDeleteBlock: vi.fn(),
  handleUpdateBlock: vi.fn(),
  handleReorderBlocks: vi.fn(),
  undoBlocks: vi.fn(),
  redoBlocks: vi.fn(),
  canUndo: false,
  canRedo: false,
};

/**
 * Mock wallet state for testing
 */
export const mockWalletState = {
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

/**
 * Mock modal state for testing
 */
export const mockModalState = {
  isBacktestOpen: false,
  isPortfolioOpen: false,
  isSettingsOpen: false,
  isLibraryOpen: false,
  isOptimizationOpen: false,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
