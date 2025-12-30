import type React from 'react';
import { Suspense, lazy, useCallback, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { getUserFriendlyErrorMessage } from '../utils/errorHandler';
import { Spine } from './Spine';
import { AIBlockSuggester } from './workspace/AIBlockSuggester';
import { BlockConfigPanel } from './workspace/BlockConfigPanel';
import { ExecuteButton } from './workspace/ExecuteButton';
import { NetworkBadge } from './workspace/NetworkBadge';
import { SecondaryMenu } from './workspace/SecondaryMenu';
import { ValidationStatus } from './workspace/ValidationStatus';
import { ZoomControls } from './workspace/ZoomControls';

// Lazy load modals and heavy components
const BacktestModal = lazy(() =>
  import('./modals/BacktestModal').then((m) => ({ default: m.BacktestModal }))
);
const PortfolioModal = lazy(() =>
  import('./modals/PortfolioModal').then((m) => ({ default: m.PortfolioModal }))
);
const StrategyLibraryModal = lazy(() =>
  import('./modals/StrategyLibraryModal').then((m) => ({ default: m.StrategyLibraryModal }))
);
const SettingsModal = lazy(() =>
  import('./modals/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const OptimizationPanel = lazy(() =>
  import('./OptimizationPanel').then((m) => ({ default: m.OptimizationPanel }))
);
const SimulationModal = lazy(() =>
  import('./modals/SimulationModal').then((m) => ({ default: m.SimulationModal }))
);
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useModalState } from '../hooks/useModalState';
import { useToast } from '../hooks/useToast';
import { useWallet } from '../hooks/useWallet';
import { useWorkspaceState } from '../hooks/useWorkspaceState';
import { RouteGuard } from './RouteGuard';
import type { DeFiBacktestResult } from '../services/defiBacktestEngine';
import { BacktestExecutionError, executeStrategy } from '../services/executionEngine';
import { portfolioTracker } from '../services/portfolioTracker';
import { exportBlocks, importBlocks } from '../services/strategyStorage';
import { simulateStrategyExecution } from '../services/web3/transactionSimulator';

const Workspace: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();

  // Extract workspace state management
  const {
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    validationResult,
    isValidating,
    showLeftPanel,
    setShowLeftPanel,
    showRightPanel,
    setShowRightPanel,
    handleAddBlock,
    handleSelectBlock,
    handleDeleteBlock,
    handleUpdateBlock,
    handleReorderBlocks,
    undoBlocks,
    redoBlocks,
    canUndo,
    canRedo,
  } = useWorkspaceState();

  // Local UI state
  const [isExecuting, setIsExecuting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [backtestResult, setBacktestResult] = useState<DeFiBacktestResult | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResult, setSimulationResult] = useState<
    import('../services/web3/transactionSimulator').SimulationResult | null
  >(null);

  // Wallet connection
  const { address, isConnected } = useWallet();

  // Consolidated modal state
  const {
    isBacktestOpen,
    isPortfolioOpen,
    isSettingsOpen,
    isLibraryOpen,
    isOptimizationOpen,
    openModal,
    closeModal,
  } = useModalState();

  const handleExport = useCallback(() => {
    try {
      const json = exportBlocks(blocks);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defi-strategy-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Strategy exported successfully');
    } catch (error) {
      logger.error('Export failed', error instanceof Error ? error : new Error(String(error)), 'Workspace');
      showError('Failed to export strategy. Please ensure your strategy is valid and try again.');
    }
  }, [blocks, showError, showSuccess]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const importedBlocks = importBlocks(json);
          setBlocks(importedBlocks);
          showSuccess('Strategy imported successfully');
        } catch (error) {
          logger.error('Import failed', error instanceof Error ? error : new Error(String(error)), 'Workspace');
          showError(getUserFriendlyErrorMessage(error, 'import'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setBlocks, showError, showSuccess]);

  const handleExecute = async () => {
    // Check wallet connection first
    if (!isConnected) {
      showError('Please connect your wallet before executing a strategy');
      return;
    }

    // Run simulation first
    try {
      const simulation = await simulateStrategyExecution(
        blocks,
        address as `0x${string}` | undefined
      );
      setSimulationResult(simulation);
      setShowSimulation(true);
    } catch (error) {
      console.error('Simulation failed:', error);
      const { getUserFriendlyErrorMessage } = await import('../utils/errorHandler');
      showError(getUserFriendlyErrorMessage(error, 'simulation'));
    }
  };

  const handleProceedWithExecution = async () => {
    setShowSimulation(false);
    setIsExecuting(true);
    try {
      const result = await executeStrategy(blocks);
      setBacktestResult(result);

      // Record backtest result in portfolio tracker
      const strategyName = blocks.length > 0 ? `Strategy with ${blocks.length} blocks` : 'Strategy';
      portfolioTracker.recordBacktestResult(result, undefined, strategyName);

      openModal('backtest'); // Show results after execution
      showSuccess('Strategy executed successfully');
    } catch (error) {
      // Error shown to user via toast notification
      // logger.error('Strategy execution failed', error instanceof Error ? error : new Error(String(error)), 'Workspace');

      if (error instanceof BacktestExecutionError) {
        const message = error.actionable ? `${error.message}. ${error.actionable}` : error.message;
        showError(message);
      } else {
        const { getUserFriendlyErrorMessage } = await import('../utils/errorHandler');
        showError(getUserFriendlyErrorMessage(error, 'execution'));
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenPalette: () => setShowLeftPanel(true),
    onExecute: () => {
      if (validationResult?.valid && !isExecuting) handleExecute();
    },
    onEscape: () => {
      setShowLeftPanel(false);
      setShowRightPanel(false);
      setSelectedBlockId(null);
      closeModal();
    },
    onDeleteBlock: () => {
      if (selectedBlockId) {
        handleDeleteBlock(selectedBlockId);
      }
    },
    onUndo: canUndo ? () => undoBlocks() : undefined,
    onRedo: canRedo ? () => redoBlocks() : undefined,
  });

  return (
    <div className="relative w-full h-screen bg-canvas overflow-hidden flex flex-col">
      {/* 1. Canvas Layer - Spine View */}
      <main className="relative w-full h-full overflow-hidden bg-dot-pattern">
        <div
          className="w-full h-full overflow-y-auto overflow-x-hidden flex items-start justify-center scroll-smooth touch-pan-y"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center top',
            transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <Spine
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={handleSelectBlock}
            onDeleteBlock={handleDeleteBlock}
            onOpenSuggester={() => setShowLeftPanel(true)}
            onReorderBlocks={handleReorderBlocks}
            onAddBlock={(block, targetIndex) => {
              const newBlock = { ...block, id: `${block.id}-${Date.now()}` };
              if (targetIndex !== undefined) {
                setBlocks((prev) => {
                  const newBlocks = [...prev];
                  newBlocks.splice(targetIndex, 0, newBlock);
                  return newBlocks;
                });
              } else {
                handleAddBlock(newBlock);
              }
            }}
          />
        </div>
      </main>

      {/* 2. Persistent UI Layer */}
      <NetworkBadge />

      <SecondaryMenu
        onOpenBacktest={() => openModal('backtest')}
        onOpenPortfolio={() => openModal('portfolio')}
        onOpenLibrary={() => openModal('library')}
        onOpenSettings={() => openModal('settings')}
        onExport={handleExport}
        onImport={handleImport}
      />

      <ExecuteButton
        isValid={(validationResult?.valid ?? false) && isConnected}
        isExecuting={isExecuting}
        onClick={handleExecute}
      />

      {/* Bottom Toolbar - Centered */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-40 items-center bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-gray-200 shadow-lg">
        <button
          onClick={() => openModal('optimization')}
          className="px-4 py-2 bg-white border border-gray-300 hover:border-orange hover:text-orange hover:bg-orange/5 text-ink font-mono text-xs font-bold uppercase transition-all shadow-sm rounded"
          title="Optimize strategy parameters"
        >
          <span className="flex items-center gap-2">
            <span>⚡</span> OPTIMIZE
          </span>
        </button>
        <div className="h-6 w-px bg-gray-300" />
        <div className="flex gap-1">
          <button
            onClick={undoBlocks}
            disabled={!canUndo}
            className="px-3 py-2 bg-white border border-gray-300 hover:border-ink hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-mono text-xs font-bold uppercase transition-all shadow-sm rounded"
            aria-label="Undo"
            title="Undo (Cmd/Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redoBlocks}
            disabled={!canRedo}
            className="px-3 py-2 bg-white border border-gray-300 hover:border-ink hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-mono text-xs font-bold uppercase transition-all shadow-sm rounded"
            aria-label="Redo"
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
        <div className="h-6 w-px bg-gray-300" />
        <ValidationStatus validationResult={validationResult} isValidating={isValidating} />
      </div>

      <ZoomControls zoomLevel={zoomLevel} onZoomChange={setZoomLevel} />

      {/* Palette Toggle - Left Edge */}
      <button
        onClick={() => setShowLeftPanel(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 w-12 h-32 bg-white border-r border-y border-gray-300 flex items-center justify-center hover:w-14 hover:border-ink transition-all z-30 shadow-sm group"
        aria-label="Open block palette"
      >
        <span className="transform -rotate-90 font-mono text-xs font-bold whitespace-nowrap text-gray-400 group-hover:text-ink">
          + AI
        </span>
      </button>

      {/* 3. On-Demand Panels Layer */}
      <AIBlockSuggester
        isOpen={showLeftPanel}
        onClose={() => setShowLeftPanel(false)}
        currentBlocks={blocks}
        onAddBlock={handleAddBlock}
      />

      <BlockConfigPanel
        isOpen={showRightPanel}
        block={selectedBlock}
        onClose={() => setShowRightPanel(false)}
        onUpdate={handleUpdateBlock}
        onDelete={() => selectedBlock && handleDeleteBlock(selectedBlock.id)}
      />

      {/* Modals - Lazy loaded with error boundaries */}
      <Suspense fallback={null}>
        {showSimulation && (
          <ErrorBoundary>
            <SimulationModal
              isOpen={showSimulation}
              onClose={() => setShowSimulation(false)}
              onProceed={handleProceedWithExecution}
              result={simulationResult}
            />
          </ErrorBoundary>
        )}
        {isBacktestOpen && (
          <ErrorBoundary>
            <BacktestModal isOpen={isBacktestOpen} onClose={closeModal} result={backtestResult} />
          </ErrorBoundary>
        )}
        {isPortfolioOpen && (
          <ErrorBoundary>
            <PortfolioModal isOpen={isPortfolioOpen} onClose={closeModal} />
          </ErrorBoundary>
        )}
        {isLibraryOpen && (
          <ErrorBoundary>
            <StrategyLibraryModal
              isOpen={isLibraryOpen}
              onClose={closeModal}
              currentBlocks={blocks}
              onLoadStrategy={(loadedBlocks) => {
                setBlocks(loadedBlocks);
                showSuccess('Strategy loaded successfully');
              }}
            />
          </ErrorBoundary>
        )}
        {isSettingsOpen && (
          <ErrorBoundary>
            <SettingsModal isOpen={isSettingsOpen} onClose={closeModal} />
          </ErrorBoundary>
        )}
        {isOptimizationOpen && (
          <ErrorBoundary>
            <OptimizationPanel
              isOpen={isOptimizationOpen}
              onClose={closeModal}
              blocks={blocks}
              onApplySolution={(updatedBlocks) => {
                setBlocks(updatedBlocks);
                showSuccess('Optimized parameters applied to strategy');
              }}
            />
          </ErrorBoundary>
        )}
      </Suspense>
    </div>
  );
};

export default Workspace;
