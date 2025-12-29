import type React from 'react';
import { Suspense, lazy, useCallback, useState } from 'react';
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
import type { DeFiBacktestResult } from '../services/defiBacktestEngine';
import { BacktestExecutionError, executeStrategy } from '../services/executionEngine';
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
      console.error('Export failed:', error);
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
          console.error('Import failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to import strategy';
          showError(
            `Import failed: ${errorMessage}. Please ensure the file is a valid strategy JSON.`
          );
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
      showError('Failed to simulate transaction. Please try again.');
    }
  };

  const handleProceedWithExecution = async () => {
    setShowSimulation(false);
    setIsExecuting(true);
    try {
      const result = await executeStrategy(blocks);
      setBacktestResult(result);
      openModal('backtest'); // Show results after execution
      showSuccess('Strategy executed successfully');
    } catch (error) {
      console.error('Strategy execution failed:', error);

      if (error instanceof BacktestExecutionError) {
        const message = error.actionable ? `${error.message}. ${error.actionable}` : error.message;
        showError(message);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        showError(
          `Strategy execution failed: ${errorMessage}. Please check your strategy configuration and try again.`
        );
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
          className="w-full h-full overflow-y-auto overflow-x-hidden flex items-start justify-center scroll-smooth"
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-40 items-center bg-white/95 backdrop-blur-sm px-6 py-3 rounded-lg border border-gray-200 shadow-lg">
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

      {/* Modals - Lazy loaded */}
      <Suspense fallback={null}>
        {showSimulation && (
          <SimulationModal
            isOpen={showSimulation}
            onClose={() => setShowSimulation(false)}
            onProceed={handleProceedWithExecution}
            result={simulationResult}
          />
        )}
        {isBacktestOpen && (
          <BacktestModal isOpen={isBacktestOpen} onClose={closeModal} result={backtestResult} />
        )}
        {isPortfolioOpen && <PortfolioModal isOpen={isPortfolioOpen} onClose={closeModal} />}
        {isLibraryOpen && (
          <StrategyLibraryModal
            isOpen={isLibraryOpen}
            onClose={closeModal}
            currentBlocks={blocks}
            onLoadStrategy={(loadedBlocks) => {
              setBlocks(loadedBlocks);
              showSuccess('Strategy loaded successfully');
            }}
          />
        )}
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={closeModal} />}
        {isOptimizationOpen && (
          <OptimizationPanel
            isOpen={isOptimizationOpen}
            onClose={closeModal}
            blocks={blocks}
            onApplySolution={(updatedBlocks) => {
              setBlocks(updatedBlocks);
              showSuccess('Optimized parameters applied to strategy');
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Workspace;
