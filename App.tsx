import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { ErrorBoundary } from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import { ToastContainer } from './components/ui/ToastContainer';
import { ToastProvider } from './hooks/useToast';
import { wagmiConfig } from './services/web3/config';
import type { ViewState } from './types';
import { trpcClient } from './utils/api-client';
import { initSentry } from './utils/monitoring';
import { trpc } from './utils/trpc';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');

  // Initialize monitoring
  useEffect(() => {
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (sentryDsn) {
      initSentry(sentryDsn);
    }
  }, []);

  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              {view === 'landing' && <LandingPage onEnter={() => setView('workspace')} />}
              {view === 'workspace' && (
                <ErrorBoundary>
                  <Workspace />
                </ErrorBoundary>
              )}
              <ToastContainer />
            </ToastProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </WagmiProvider>
    </ErrorBoundary>
  );
};

export default App;
