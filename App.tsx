import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';
import { useTheme } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { trpcClient } from './lib/api/client';
import { trpc } from './lib/api/trpc';
import { initSentry } from './lib/monitoring/monitoring';
import { wagmiConfig } from './services/web3/config';
import type { ViewState } from './types';

// Lazy load main views to reduce initial bundle size
const LandingPage = lazy(() =>
  import('./components/LandingPage').then((m) => ({ default: m.default }))
);
const Workspace = lazy(() =>
  import('./components/Workspace').then((m) => ({ default: m.default }))
);

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
  useTheme(); // Initialize theme

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
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-screen bg-canvas">
                    <div className="text-ink font-mono">Loading...</div>
                  </div>
                }
              >
                {view === 'landing' && <LandingPage onEnter={() => setView('workspace')} />}
                {view === 'workspace' && (
                  <ErrorBoundary>
                    <Workspace />
                  </ErrorBoundary>
                )}
              </Suspense>
              <ToastContainer />
            </ToastProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </WagmiProvider>
    </ErrorBoundary>
  );
};

export default App;
