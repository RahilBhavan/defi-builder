import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { ViewState } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');

  return (
    <ErrorBoundary>
      <ToastProvider>
        {view === 'landing' && (
          <LandingPage onEnter={() => setView('workspace')} />
        )}
        {view === 'workspace' && (
          <ErrorBoundary>
            <Workspace />
          </ErrorBoundary>
        )}
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
