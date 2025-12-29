import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewState } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');

  return (
    <ErrorBoundary>
      {view === 'landing' && (
        <LandingPage onEnter={() => setView('workspace')} />
      )}
      {view === 'workspace' && (
        <ErrorBoundary>
          <Workspace />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  );
};

export default App;
